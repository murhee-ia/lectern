-- How every membership came to exist, and a link from each to its member profile,
-- An Admin restricting one member from joining or starting team sessions, though never from one they started,
-- The signed-in user's permissions, answered by has_permission() instead of re-derived in TypeScript,
-- An Admin renaming their organization, and
-- Invitations kept as a log: canceled and resent, but never deleted.
-- Depends on 20260924073928 for the members.restrict permission.
-- Every object below is written idempotently, so that this migration can be re-run without error.

SET search_path = public, extensions;


-- ============================================================================
-- T Y P E S
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.membership_join_method AS ENUM (
    'organization_creation',
    'join_code',
    'email_invitation'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- T A B L E S
-- ============================================================================

-- Joining and starting team sessions are the only two things an Admin can
-- withhold. Which role each applies to is checked by the INSERT policy below.
CREATE TABLE IF NOT EXISTS membership_permission_restrictions (
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  permission app_permission NOT NULL CHECK (permission IN ('sessions.team.join', 'sessions.team.start')),
  restricted_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id, permission),
  FOREIGN KEY (user_id, organization_id) REFERENCES memberships (user_id, organization_id) ON DELETE CASCADE
);

COMMENT ON TABLE membership_permission_restrictions IS 'Permissions an Admin has withheld from one member, subtracted by has_permission() from what their role grants. Restricting inserts a row; allowing back deletes it. Cleared when the member''s role changes, for the whole organization when its Admin role is handed off, and with the membership itself.';


-- ============================================================================
-- C O L U M N S
-- ============================================================================

-- NOT NULL with no default: every path that creates a membership has to say which path it is.
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS join_method membership_join_method NOT NULL;

COMMENT ON COLUMN memberships.join_method IS 'How this membership came to exist. Fixed at creation. Admin handoff changes role but never this.';


-- ============================================================================
-- C O N S T R A I N T S
-- ============================================================================

-- 100, not the 80 that names on member_profiles allow: an automatic name is
-- "<display name>'s Organization", and an 80-character display name makes 95.
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_name_length;
ALTER TABLE organizations ADD CONSTRAINT organizations_name_length
  CHECK (char_length(trim(name)) BETWEEN 1 AND 100);

-- A second foreign key on user_id, beside the existing one to auth.users. It's
-- what lets PostgREST embed member_profiles in a memberships query, so a
-- member list is one request instead of two. Always satisfied: the profile is
-- created by the auth.users trigger, before any membership can exist.
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_user_id_profile_fkey;
ALTER TABLE memberships ADD CONSTRAINT memberships_user_id_profile_fkey
  FOREIGN KEY (user_id) REFERENCES member_profiles (id) ON DELETE CASCADE;


-- ============================================================================
-- P R I V I L E G E S
-- ============================================================================

REVOKE UPDATE ON organizations FROM public, anon, authenticated;
GRANT UPDATE (name) ON organizations TO authenticated;


-- ============================================================================
-- T R I G G E R S
-- ============================================================================

CREATE OR REPLACE FUNCTION restrict_memberships_update_columns() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
  BEGIN
    IF new.user_id <> old.user_id
      OR new.organization_id <> old.organization_id
      OR new.join_method <> old.join_method
    THEN
      RAISE EXCEPTION 'Only the role column of a membership row may be updated';
    END IF;
    RETURN new;
  END;
$$;

CREATE OR REPLACE FUNCTION clear_membership_restrictions_on_role_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  BEGIN
    -- A handoff is the only way to become Admin, and a new Admin starts with
    -- none of the previous Admin's restrictions in force.
    IF new.role = 'admin' THEN
      DELETE FROM membership_permission_restrictions
        WHERE organization_id = new.organization_id;
    ELSE
      DELETE FROM membership_permission_restrictions
        WHERE organization_id = new.organization_id
          AND user_id = new.user_id;
    END IF;
    RETURN NULL;
  END;
$$;

COMMENT ON FUNCTION clear_membership_restrictions_on_role_change() IS 'A restriction withholds something the member''s previous role granted, so a new role starts with none. An Admin handoff clears every restriction in the organization.';

DROP TRIGGER IF EXISTS memberships_clear_restrictions_on_role_change ON memberships;
CREATE TRIGGER memberships_clear_restrictions_on_role_change
  AFTER UPDATE OF role ON memberships
  FOR EACH ROW
  WHEN (old.role IS DISTINCT FROM new.role)
  EXECUTE FUNCTION clear_membership_restrictions_on_role_change();


-- ============================================================================
-- F U N C T I O N S
-- ============================================================================

-- Unchanged apart from the NOT EXISTS: a restriction can only withhold what
-- the role grants, never add what it lacks.
CREATE OR REPLACE FUNCTION has_permission(check_organization_id uuid, permission app_permission) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM memberships m
      JOIN role_permissions rp ON rp.role = m.role
      WHERE m.organization_id = check_organization_id
        AND m.user_id = auth.uid()
        -- Qualified as has_permission.permission (not a bare `permission`) because
        -- the parameter name collides with the rp.permission column in this query.
        -- PostgreSQL resolves an unqualified name to the column when both are in
        -- scope, so a bare `permission` here would silently compare rp.permission
        -- to itself and always return true — this qualification is what makes the
        -- check actually compare against the caller's requested permission.
        AND rp.permission = has_permission.permission
        AND NOT EXISTS (
          SELECT 1
            FROM membership_permission_restrictions r
            WHERE r.organization_id = m.organization_id
              AND r.user_id = m.user_id
              AND r.permission = has_permission.permission
        )
  );
$$;

COMMENT ON FUNCTION has_permission(uuid, app_permission) IS 'True if the current user''s role in the given organization is seeded, via role_permissions, with the given permission, and an Admin has not restricted it from them. The primary authorization check for RLS policies and RPCs.';

-- Bodies unchanged apart from each INSERT INTO memberships naming its join_method.
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

    INSERT INTO memberships (user_id, organization_id, role, join_method)
    VALUES (calling_user_id, new_organization_id, 'admin', 'organization_creation');

    RETURN new_organization_id;
  END;
$$;

-- Bodies unchanged apart from each INSERT INTO memberships naming its join_method.
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

    INSERT INTO memberships (user_id, organization_id, role, join_method)
    VALUES (calling_user_id, target_organization_id, 'member', 'join_code')
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    RETURN target_organization_id;
  END;
$$;

-- Built on has_permission() rather than restating its join of memberships and
-- role_permissions, so the two can never disagree: restrictions, added to
-- has_permission() above, show up here with no change and none in the
-- application. Eighteen calls to a small lookup is negligible next to the
-- cost of the two drifting apart.
--
-- SECURITY INVOKER — unlike the RLS helpers it calls, this reads nothing the
-- caller couldn't read directly, so it has no reason to run as its owner.
CREATE OR REPLACE FUNCTION current_organization_permissions(check_organization_id uuid) RETURNS SETOF app_permission
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT permission
    FROM unnest(enum_range(NULL::app_permission)) AS permission
    WHERE has_permission(check_organization_id, permission);
$$;

COMMENT ON FUNCTION current_organization_permissions(uuid) IS 'Every permission the current user holds in the given organization, as has_permission() decides it. Empty for a non-member.';

-- The one team-session rule that isn't a bare permission: joining needs
-- sessions.team.join, except for a session you started yourself. Starting
-- always lets you into your own session, so a Session leader restricted from
-- joining can still run the ones they start. Having started it isn't enough on
-- its own, though: someone who has since left the organization can't get back in.
-- Every policy on the team-session that asks "may this user join?"
-- calls this, never has_permission(…, 'sessions.team.join') directly.
CREATE OR REPLACE FUNCTION can_join_team_session(check_organization_id uuid, session_started_by uuid) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT has_permission(check_organization_id, 'sessions.team.join')
    OR (
      coalesce(session_started_by = auth.uid(), false)
      AND is_organization_member(check_organization_id)
    );
$$;

COMMENT ON FUNCTION can_join_team_session(uuid, uuid) IS 'True if the current user may join a team session in the given organization: they hold sessions.team.join, or they started that session and are still a member.';


-- ============================================================================
-- R O W   L E V E L   S E C U R I T Y
-- ============================================================================

ALTER TABLE membership_permission_restrictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins and the restricted member can view restrictions" ON membership_permission_restrictions;
CREATE POLICY "admins and the restricted member can view restrictions" ON membership_permission_restrictions
  FOR SELECT
  TO authenticated
  USING (has_permission(organization_id, 'members.restrict') OR user_id = auth.uid());

-- A Member can be restricted from joining; a Session leader from joining,
-- starting, or both (the table's CHECK limits it to those two). An Admin can
-- never be restricted.
DROP POLICY IF EXISTS "admins can restrict what a member's role allows" ON membership_permission_restrictions;
CREATE POLICY "admins can restrict what a member's role allows" ON membership_permission_restrictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_permission(organization_id, 'members.restrict')
    AND restricted_by = auth.uid()
    AND EXISTS (
      SELECT 1
        FROM memberships AS membership
        WHERE membership.organization_id = membership_permission_restrictions.organization_id
          AND membership.user_id = membership_permission_restrictions.user_id
          AND (
            membership.role = 'session_leader'
            OR (membership.role = 'member' AND membership_permission_restrictions.permission = 'sessions.team.join')
          )
    )
  );

DROP POLICY IF EXISTS "admins can lift a restriction" ON membership_permission_restrictions;
CREATE POLICY "admins can lift a restriction" ON membership_permission_restrictions
  FOR DELETE
  TO authenticated
  USING (has_permission(organization_id, 'members.restrict'));

DROP POLICY IF EXISTS "admins can update their organization" ON organizations;
CREATE POLICY "admins can update their organization" ON organizations
  FOR UPDATE
  TO authenticated
  USING (has_permission(id, 'org.settings.manage'))
  WITH CHECK (has_permission(id, 'org.settings.manage'));

-- Replaces the FOR ALL policy, which allowed DELETE. An invitation is never
-- deleted — the invitations page is the organization's log of them — so
-- canceling and resending are UPDATEs, and no DELETE policy exists.
DROP POLICY IF EXISTS "admins manage invites for their organizations" ON organization_invites;

DROP POLICY IF EXISTS "admins can view their organization's invites" ON organization_invites;
CREATE POLICY "admins can view their organization's invites" ON organization_invites
  FOR SELECT
  TO authenticated
  USING (has_permission(organization_id, 'invites.manage') OR is_platform_admin());

DROP POLICY IF EXISTS "admins can send invites" ON organization_invites;
CREATE POLICY "admins can send invites" ON organization_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (has_permission(organization_id, 'invites.manage'));

DROP POLICY IF EXISTS "admins can cancel and resend invites" ON organization_invites;
CREATE POLICY "admins can cancel and resend invites" ON organization_invites
  FOR UPDATE
  TO authenticated
  USING (has_permission(organization_id, 'invites.manage') OR is_platform_admin())
  WITH CHECK (has_permission(organization_id, 'invites.manage') OR is_platform_admin());


-- ============================================================================
-- I N S E R T
-- ============================================================================

INSERT INTO role_permissions (role, permission) VALUES
  ('admin', 'members.restrict')
ON CONFLICT (role, permission) DO NOTHING;


-- ============================================================================
-- F U N C T I O N   G R A N T S
-- ============================================================================

-- CREATE OR REPLACE keeps the existing grants on every function redefined
-- above; only the new ones need theirs set.
REVOKE ALL ON FUNCTION clear_membership_restrictions_on_role_change() FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION current_organization_permissions(uuid)          FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION current_organization_permissions(uuid)       TO authenticated, service_role;
REVOKE ALL ON FUNCTION can_join_team_session(uuid, uuid)               FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_join_team_session(uuid, uuid)            TO authenticated, service_role;
