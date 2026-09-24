-- Plan pricing in real cents,
-- Identity resolution that survives an empty string,
-- A personal organization that is actually the caller's own, and
-- direct EXECUTE removed from every function a client has no business calling.

-- Every object below is written idempotently, so that this migration can be re-run without error.

SET search_path = public, extensions;


-- ============================================================================
-- P L A N   P R I C I N G
-- ============================================================================

UPDATE plans SET price_cents = 1500 WHERE tier = 'basic' AND price_cents = 15;
UPDATE plans SET price_cents = 3000 WHERE tier = 'pro'   AND price_cents = 30;
UPDATE plans SET price_cents = 5000 WHERE tier = 'ultra' AND price_cents = 50;


-- ============================================================================
-- T R I G G E R S
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user_profile() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    resolved_first_name text;
    resolved_last_name text;
    resolved_display_name text;
  BEGIN
    -- first_name/last_name/display_name are lectern's own password-signup
    -- metadata keys; the rest is Google's OAuth lands in raw_user_meta_data
    resolved_first_name := coalesce(
      nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'given_name'), '')
    );
    resolved_last_name := coalesce(
      nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'family_name'), '')
    );
    -- concat_ws skips NULL arguments outright, so a user whose last name is
    -- unknown resolves to a clean "Jane" rather than "Jane ".
    resolved_display_name := coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(concat_ws(' ', resolved_first_name, resolved_last_name), '')
    );

    INSERT INTO member_profiles (id, email, display_name, first_name, last_name)
    VALUES (new.id, new.email, resolved_display_name, resolved_first_name, resolved_last_name)
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
$$;

-- The two functions in the schema without an explicit search_path, which
-- left them resolving unqualified names against whatever the caller happened
-- to have set. Bodies are unchanged.
CREATE OR REPLACE FUNCTION restrict_memberships_update_columns() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
  BEGIN
    IF new.user_id <> old.user_id OR new.organization_id <> old.organization_id THEN
      RAISE EXCEPTION 'Only the role column of a membership row may be updated';
    END IF;
    RETURN new;
  END;
$$;

CREATE OR REPLACE FUNCTION restrict_member_profiles_update_columns() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
  BEGIN
    -- display_name/first_name/last_name/avatar_path are the columns a client CAN change directly.
    IF pg_trigger_depth() = 1 AND (
      new.id <> old.id OR new.email <> old.email OR new.created_at <> old.created_at
    ) THEN
      RAISE EXCEPTION 'Only display name, first name, last name, and avatar may be updated directly on a member profiles';
    END IF;
    RETURN new;
  END;
$$;


-- ============================================================================
-- F U N C T I O N S
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_personal_organization() RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    calling_user_id uuid := auth.uid();
    existing_organization_id uuid;
    new_organization_id uuid;
    owner_label text;
  BEGIN
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Not signed in';
    END IF;

    -- A confirmation link can be opened twice. Without serializing per user,
    -- both transactions see no personal organization and each creates one.
    PERFORM pg_advisory_xact_lock(hashtext('ensure_personal_organization:' || calling_user_id::text));

    -- "Personal" means the organization this user created for themselves and
    -- still admins — not merely the first membership row found. For someone who
    -- signed up with a join code that first row is somebody else's org, and with
    -- no ORDER BY it was not even a stable choice once a user belongs to several.
    SELECT organization.id INTO existing_organization_id
      FROM organizations AS organization
      JOIN memberships AS membership
        ON membership.organization_id = organization.id
       AND membership.user_id = calling_user_id
      WHERE organization.created_by = calling_user_id
        AND membership.role = 'admin'
      ORDER BY organization.created_at ASC, organization.id ASC
      LIMIT 1;

    IF existing_organization_id IS NOT NULL THEN
      RETURN existing_organization_id;
    END IF;

    -- Name it after the person. first_name covers password signup and 
    -- any Google account that sends given_name;
    -- display_name covers the common Google case of a bare `name` claim.
    SELECT coalesce(
            nullif(trim(profile.display_name), ''),
            nullif(trim(profile.first_name), ''),
            nullif(split_part(profile.email, '@', 1), '')
           )
      INTO owner_label
      FROM member_profiles AS profile
      WHERE profile.id = calling_user_id;

    owner_label := coalesce(owner_label, nullif(split_part(auth.email(), '@', 1), ''), 'My');

    INSERT INTO organizations (name, plan, created_by)
    VALUES (owner_label || '''s Organization', 'free', calling_user_id)
    RETURNING id INTO new_organization_id;

    INSERT INTO memberships (user_id, organization_id, role)
    VALUES (calling_user_id, new_organization_id, 'admin');

    RETURN new_organization_id;
  END;
$$;

CREATE OR REPLACE FUNCTION join_organization_by_code(code text) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    calling_user_id uuid := auth.uid();
    target_organization_id uuid;
  BEGIN
    -- Checked before the lookup, so the function can never tell a caller
    -- anything about a code they aren't entitled to try. Previously a signed-out
    -- caller with a valid code got as far as the INSERT, and the resulting
    -- NOT NULL violation echoed the organization's uuid back in its error detail
    -- while an invalid code raised a different message.
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Not signed in';
    END IF;

    SELECT id INTO target_organization_id FROM organizations WHERE join_code = code;

    IF target_organization_id IS NULL THEN
      RAISE EXCEPTION 'Invalid organization code';
    END IF;

    INSERT INTO memberships (user_id, organization_id, role)
    VALUES (calling_user_id, target_organization_id, 'member')
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    RETURN target_organization_id;
  END;
$$;


-- ============================================================================
-- F U N C T I O N   G R A N T S
-- ============================================================================

-- Supabase's default privileges hand EXECUTE on every function in public to
-- anon, authenticated and service_role alike. Revoke from all four principals
-- first (a plain REVOKE FROM public leaves those explicit role grants intact),
-- then grant back only what each function genuinely needs.

-- Trigger functions are invoked by the trigger machinery, never by a caller.
-- PostgreSQL checks EXECUTE when the trigger is created, not when it fires, so
-- revoking here does not stop supabase_auth_admin's inserts from firing them.
REVOKE ALL ON FUNCTION handle_new_user_profile()                 FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION handle_updated_user_email()               FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION prevent_admin_membership_delete()         FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION restrict_memberships_update_columns()     FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION restrict_member_profiles_update_columns() FROM public, anon, authenticated, service_role;

-- RLS helpers are evaluated inside policies as the querying role, so
-- authenticated must keep EXECUTE or every policy that calls one starts
-- erroring. No anon-facing policy calls any of them — the two policies that do
-- apply to anon (plans, role_permissions) are both bare USING (TRUE).
REVOKE ALL ON FUNCTION is_platform_admin()                     FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_platform_admin()                  TO authenticated, service_role;
REVOKE ALL ON FUNCTION is_organization_member(uuid)            FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_organization_member(uuid)         TO authenticated, service_role;
REVOKE ALL ON FUNCTION has_role(uuid, organization_role)       FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_role(uuid, organization_role)    TO authenticated, service_role;
REVOKE ALL ON FUNCTION has_permission(uuid, app_permission)    FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION has_permission(uuid, app_permission) TO authenticated, service_role;

-- Client-callable RPCs: every one of them acts on behalf of a signed-in user.
REVOKE ALL ON FUNCTION ensure_personal_organization()     FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION ensure_personal_organization()  TO authenticated, service_role;
REVOKE ALL ON FUNCTION join_organization_by_code(text)    FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION join_organization_by_code(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION can_delete_own_account()           FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_delete_own_account()        TO authenticated, service_role;
