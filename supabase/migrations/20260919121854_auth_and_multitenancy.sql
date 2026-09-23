-- Profiles mirror, org-of-one, join-by-code resolution, account-deletion guard.
-- Every object below is written idempotently, so that this migration can be re-run without error.


-- ============================================================================
-- T A B L E S
-- ============================================================================

-- member profiles are written only by a trigger below; display_name, first_name,
-- and last_name, can be updated by the owner themselves
CREATE TABLE IF NOT EXISTS member_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  first_name text,
  last_name text,
  avatar_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE member_profiles IS 'Public mirror of auth.users as auth.users itself is never exposed via PostgREST.';

ALTER TABLE member_profiles DROP CONSTRAINT IF EXISTS member_profiles_avatar_path_matches_id;
ALTER TABLE member_profiles ADD CONSTRAINT member_profiles_avatar_path_matches_id
  CHECK (avatar_path IS NULL OR avatar_path = id::text || '/avatar');

ALTER TABLE member_profiles DROP CONSTRAINT IF EXISTS member_profiles_display_name_length;
ALTER TABLE member_profiles ADD CONSTRAINT member_profiles_display_name_length
  CHECK (display_name IS NULL OR char_length(trim(display_name)) BETWEEN 1 AND 80);

ALTER TABLE member_profiles DROP CONSTRAINT IF EXISTS member_profiles_first_name_length;
ALTER TABLE member_profiles ADD CONSTRAINT member_profiles_first_name_length
  CHECK (first_name IS NULL OR char_length(trim(first_name)) BETWEEN 1 AND 80);

ALTER TABLE member_profiles DROP CONSTRAINT IF EXISTS member_profiles_last_name_length;
ALTER TABLE member_profiles ADD CONSTRAINT member_profiles_last_name_length
  CHECK (last_name IS NULL OR char_length(trim(last_name)) BETWEEN 1 AND 80);


-- ============================================================================
-- S T O R A G E   ( A V A T A R S )
-- ============================================================================

-- Private bucket, never a bare public URL.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- R O W   L E V E L   S E C U R I T Y   P O L I C I E S
-- ============================================================================

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "a user can view their own profile" ON member_profiles;
CREATE POLICY "a user can view their own profile" ON member_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "co-members can view each other's profile" ON member_profiles;
CREATE POLICY "co-members can view each other's profile" ON member_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM memberships AS viewer_membership
        JOIN memberships AS target_membership
          ON target_membership.organization_id = viewer_membership.organization_id
        WHERE viewer_membership.user_id = auth.uid()
          AND target_membership.user_id = member_profiles.id
    )
  );

DROP POLICY IF EXISTS "a user can update their own profile" ON member_profiles;
CREATE POLICY "a user can update their own profile" ON member_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "a user can upload their own avatar" ON storage.objects;
CREATE POLICY "a user can upload their own avatar" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "a user can replace their own avatar" ON storage.objects;
CREATE POLICY "a user can replace their own avatar" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "a user can delete their own avatar" ON storage.objects;
CREATE POLICY "a user can delete their own avatar" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "a user and co-members can view an avatar" ON storage.objects;
CREATE POLICY "a user and co-members can view an avatar" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
          FROM memberships AS viewer_membership
          JOIN memberships AS target_membership
            ON target_membership.organization_id = viewer_membership.organization_id
          WHERE viewer_membership.user_id = auth.uid()
            AND target_membership.user_id::text = (storage.foldername(name))[1]
      )
    )
  );


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
    -- first_name/last_name/display_name are lectern's own password-signup metadata
    -- keys; given_name/family_name/name are Google's OAuth claim names,
    -- which land in raw_user_meta_data automatically on Google sign-up.
    resolved_first_name := nullif(trim(coalesce(
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'given_name'
    )), '');
    resolved_last_name := nullif(trim(coalesce(
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'family_name'
    )), '');
    -- concat() (unlike ||) skips NULL args, so this still resolves to a
    -- sensible "First Last" even when only one name half is known.
    resolved_display_name := nullif(trim(coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      concat(resolved_first_name, ' ', resolved_last_name)
    )), '');

    INSERT INTO member_profiles (id, email, display_name, first_name, last_name)
    VALUES (new.id, new.email, resolved_display_name, resolved_first_name, resolved_last_name)
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
$$;

COMMENT ON FUNCTION handle_new_user_profile() IS 'Mirrors every new auth.users row into public.member_profiles, resolving display_name, first_name, last_name from raw_user_meta_data so RLS-protected joins can display who a member is.';

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

CREATE OR REPLACE FUNCTION handle_updated_user_email() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  BEGIN
    IF new.email IS DISTINCT FROM old.email THEN
      UPDATE member_profiles SET email = new.email WHERE id = new.id;
    END IF;
    RETURN new;
  END;
$$;

COMMENT ON FUNCTION handle_updated_user_email() IS 'Keeps member_profiles.email in sync when a user changes their auth.email.';

DROP TRIGGER IF EXISTS on_auth_user_updated_email ON auth.users;
CREATE TRIGGER on_auth_user_updated_email
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_updated_user_email();

CREATE OR REPLACE FUNCTION restrict_member_profiles_update_columns() RETURNS trigger
LANGUAGE plpgsql
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

COMMENT ON FUNCTION restrict_member_profiles_update_columns() IS 'Defense-in-depth: a member_profiles row''s id/email/created_at may never change via a direct client UPDATE — only display_name/first_name/last_name/avatar_path. email is instead kept in sync from auth.users by handle_updated_user_email().';

DROP TRIGGER IF EXISTS member_profiles_restrict_update ON member_profiles;
CREATE TRIGGER member_profiles_restrict_update
  BEFORE UPDATE ON member_profiles
  FOR EACH ROW EXECUTE FUNCTION restrict_member_profiles_update_columns();


-- ============================================================================
-- F U N C T I O N S
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_personal_organization() RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    existing_organization_id uuid;
    new_organization_id uuid;
  BEGIN
    SELECT organization_id INTO existing_organization_id
      FROM memberships
      WHERE user_id = auth.uid()
      LIMIT 1;

    IF existing_organization_id IS NOT NULL THEN
      RETURN existing_organization_id;
    END IF;

    INSERT INTO organizations (name, plan, created_by)
    VALUES (
      coalesce(split_part(auth.email(), '@', 1), 'My') || '''s Organization',
      'free',
      auth.uid()
    )
    RETURNING id INTO new_organization_id;

    INSERT INTO memberships (user_id, organization_id, role)
    VALUES (auth.uid(), new_organization_id, 'admin');

    RETURN new_organization_id;
  END;
$$;

COMMENT ON FUNCTION ensure_personal_organization() IS 'Idempotent — if the caller already belongs to any organization, returns it unchanged; otherwise creates a Free org-of-one and makes the caller its sole Admin.';

CREATE OR REPLACE FUNCTION join_organization_by_code(code text) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    target_organization_id uuid;
  BEGIN
    SELECT id INTO target_organization_id FROM organizations WHERE join_code = code;

    IF target_organization_id IS NULL THEN
      RAISE EXCEPTION 'Invalid organization code';
    END IF;

    INSERT INTO memberships (user_id, organization_id, role)
    VALUES (auth.uid(), target_organization_id, 'member')
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    RETURN target_organization_id;
  END;
$$;

COMMENT ON FUNCTION join_organization_by_code(text) IS 'Joins the caller to the organization owning this join code, always as Member. Raises if the code is invalid.';

CREATE OR REPLACE FUNCTION can_delete_own_account() RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
      FROM memberships AS admin_membership
      WHERE admin_membership.user_id = auth.uid()
        AND admin_membership.role = 'admin'
        AND (
          SELECT count(*) FROM memberships AS other_membership
            WHERE other_membership.organization_id = admin_membership.organization_id
        ) > 1
  );
$$;

COMMENT ON FUNCTION can_delete_own_account() IS 'False if the caller is sole Admin of any organization with other members because they must complete the handoff first. An org-of-one where the caller is the only member never blocks deletion.';
