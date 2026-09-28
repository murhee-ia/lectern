-- How every membership came to exist, and a link from each to its member profile,
-- An Admin restricting one member from joining or starting team sessions, though never from one they started,
-- The signed-in user's permissions, answered by has_permission() instead of re-derived in TypeScript,
-- An Admin renaming their organization, and
-- Email invitations: sent, canceled, resent, and accepted only through the
-- functions below, and kept as a log that is never deleted.
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

-- An invitation link carries a token; only its hash is stored, so reading the
-- table never yields a working link.
ALTER TABLE organization_invites ADD COLUMN IF NOT EXISTS token_hash text NOT NULL;
ALTER TABLE organization_invites DROP COLUMN IF EXISTS token;

ALTER TABLE organization_invites ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE organization_invites ADD COLUMN IF NOT EXISTS accepted_by uuid;

COMMENT ON COLUMN organization_invites.token_hash IS 'SHA-256 of the token in the emailed link. Only the invitation functions compare against it; no role can read it.';
COMMENT ON COLUMN organization_invites.created_at IS 'When the invitation was first sent. Resending refreshes the same row, so this never moves.';
COMMENT ON COLUMN organization_invites.accepted_at IS 'When the invitee accepted, creating their membership. Set only with status accepted.';
COMMENT ON COLUMN organization_invites.accepted_by IS 'The account that accepted, whose sign-in email matched the invitation.';


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

-- Three statuses; "expired" is a pending invitation past expires_at, not a status.
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_status_check;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_status_check
  CHECK (status IN ('pending', 'accepted', 'canceled'));

-- Stored the way every function compares it: trimmed and lowercase.
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_email_normalized;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_email_normalized
  CHECK (email = lower(btrim(email)) AND email <> '');

-- An accepted invitation always records when; no other status does.
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_acceptance_recorded;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_acceptance_recorded
  CHECK ((status = 'accepted') = (accepted_at IS NOT NULL));

-- Both people an invitation points at get a member_profiles key beside their
-- auth.users one, with the same ON DELETE, so a query can embed them.
ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_invited_by_profile_fkey;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_invited_by_profile_fkey
  FOREIGN KEY (invited_by) REFERENCES member_profiles (id);

ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_accepted_by_fkey;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_accepted_by_fkey
  FOREIGN KEY (accepted_by) REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE organization_invites DROP CONSTRAINT IF EXISTS organization_invites_accepted_by_profile_fkey;
ALTER TABLE organization_invites ADD CONSTRAINT organization_invites_accepted_by_profile_fkey
  FOREIGN KEY (accepted_by) REFERENCES member_profiles (id) ON DELETE SET NULL;


-- ============================================================================
-- I N D E X E S
-- ============================================================================

-- One open invitation per address per organization: inviting the same address
-- again refreshes that row instead of adding another. Accepted rows stay as
-- history and don't count, so someone removed later can be invited again.
CREATE UNIQUE INDEX IF NOT EXISTS index_organization_invites_organization_id_email_unaccepted
  ON organization_invites (organization_id, email)
  WHERE status <> 'accepted';

CREATE UNIQUE INDEX IF NOT EXISTS index_organization_invites_token_hash
  ON organization_invites (token_hash);

-- The invitations page lists newest first.
CREATE INDEX IF NOT EXISTS index_organization_invites_organization_id_created_at
  ON organization_invites (organization_id, created_at DESC);


-- ============================================================================
-- P R I V I L E G E S
-- ============================================================================

REVOKE UPDATE ON organizations FROM public, anon, authenticated;
GRANT UPDATE (name) ON organizations TO authenticated;

-- Every invitation write goes through the functions below, and the token's
-- hash is readable by no one: members get every other column.
REVOKE INSERT, UPDATE, DELETE ON organization_invites FROM public, anon, authenticated;
REVOKE SELECT ON organization_invites FROM public, anon, authenticated;
GRANT SELECT (id, organization_id, email, role, invited_by, status, created_at, expires_at, accepted_at, accepted_by)
  ON organization_invites TO authenticated;


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

-- Beyond what the functions already do: which organization, address, sender,
-- and first-sent time an invitation has never change, an accepted invitation
-- never changes at all, and only a pending one can become accepted. The
-- allowed moves are pending → canceled, canceled → pending, pending →
-- pending (a resend), and pending → accepted.
CREATE OR REPLACE FUNCTION restrict_organization_invites_update() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
  BEGIN
    IF new.organization_id <> old.organization_id
      OR new.email <> old.email
      OR new.invited_by <> old.invited_by
      OR new.created_at <> old.created_at
    THEN
      RAISE EXCEPTION 'An invitation''s organization, email, sender, and first-sent time never change';
    END IF;
    IF old.status = 'accepted' THEN
      RAISE EXCEPTION 'An accepted invitation never changes';
    END IF;
    IF new.status = 'accepted' AND old.status <> 'pending' THEN
      RAISE EXCEPTION 'Only a pending invitation can be accepted';
    END IF;
    RETURN new;
  END;
$$;

DROP TRIGGER IF EXISTS organization_invites_restrict_update ON organization_invites;
CREATE TRIGGER organization_invites_restrict_update
  BEFORE UPDATE ON organization_invites
  FOR EACH ROW
  EXECUTE FUNCTION restrict_organization_invites_update();


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

-- ---------------------------------------------------------------------------
-- Email invitations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION hash_invitation_token(invitation_token text) RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT encode(extensions.digest(invitation_token, 'sha256'), 'hex');
$$;

COMMENT ON FUNCTION hash_invitation_token(text) IS 'The stored form of an invitation link''s token. Internal to the invitation functions.';

-- The organization's member cap: its plan's max_members, unless a Superadmin
-- override sets its own. NULL means no cap.
CREATE OR REPLACE FUNCTION organization_member_limit(check_organization_id uuid) RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce((organization.limit_overrides ->> 'max_members')::integer, plan.max_members)
    FROM organizations AS organization
    JOIN plans AS plan ON plan.tier = organization.plan
    WHERE organization.id = check_organization_id;
$$;

COMMENT ON FUNCTION organization_member_limit(uuid) IS 'How many members an organization may have: limit_overrides.max_members, else its plan''s max_members. NULL for no cap. Internal to the invitation functions.';

-- Sends, or refreshes, the invitation for one address, and returns the token
-- for the emailed link — the only time it exists outside the email.
--
-- Deliberately never says whether the address already belongs to a member:
-- an Admin shouldn't learn which addresses have accounts here. Such an
-- invitation just sits in the log; the invitee, on opening it, is told they
-- already belong.
CREATE OR REPLACE FUNCTION send_organization_invitation(
  target_organization_id uuid,
  invitee_email text,
  invitee_role organization_role
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    normalized_email text := lower(btrim(invitee_email));
    invitation_token text := encode(extensions.gen_random_bytes(32), 'hex');
    existing_invitation_id uuid;
    member_limit integer;
    reserved_count integer;
  BEGIN
    IF NOT has_permission(target_organization_id, 'invites.manage') THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
    IF invitee_role = 'admin' THEN
      RAISE EXCEPTION 'An invitation can''t make someone the Admin';
    END IF;
    IF normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
      RAISE EXCEPTION 'Enter a valid email address';
    END IF;

    -- One send at a time per organization, so two can't both fit the last slot.
    PERFORM pg_advisory_xact_lock(hashtext('organization_invites:' || target_organization_id::text));

    SELECT id INTO existing_invitation_id
      FROM organization_invites
      WHERE organization_id = target_organization_id
        AND email = normalized_email
        AND status <> 'accepted';

    -- Members plus invitations whose link still works, not counting this
    -- address's own open invitation, which the send replaces.
    member_limit := organization_member_limit(target_organization_id);
    IF member_limit IS NOT NULL THEN
      SELECT
          (SELECT count(*) FROM memberships WHERE organization_id = target_organization_id)
        + (SELECT count(*) FROM organization_invites
             WHERE organization_id = target_organization_id
               AND status = 'pending'
               AND expires_at > now()
               AND id IS DISTINCT FROM existing_invitation_id)
        INTO reserved_count;
      IF reserved_count + 1 > member_limit THEN
        RAISE EXCEPTION 'This organization has reached its member limit';
      END IF;
    END IF;

    IF existing_invitation_id IS NOT NULL THEN
      UPDATE organization_invites
        SET status = 'pending',
            role = invitee_role,
            token_hash = hash_invitation_token(invitation_token),
            expires_at = now() + interval '7 days'
        WHERE id = existing_invitation_id;
    ELSE
      INSERT INTO organization_invites (organization_id, email, role, invited_by, token_hash)
      VALUES (target_organization_id, normalized_email, invitee_role, auth.uid(), hash_invitation_token(invitation_token));
    END IF;

    RETURN invitation_token;
  END;
$$;

COMMENT ON FUNCTION send_organization_invitation(uuid, text, organization_role) IS 'Creates the invitation for an address, or refreshes its open one, and returns the token for the emailed link. Needs invites.manage and room under the member cap. Never reveals whether the address already belongs to a member.';

-- Resends the given invitations that can be resent — expired or canceled —
-- each with a new token and 7 more days, and returns what the emails need.
-- Any other ids are skipped, so a bulk selection can be passed as is.
CREATE OR REPLACE FUNCTION resend_organization_invitations(
  target_organization_id uuid,
  invitation_ids uuid[]
) RETURNS TABLE (
  invitation_id uuid,
  invitee_email text,
  invitee_role organization_role,
  invitation_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    resendable_ids uuid[];
    member_limit integer;
    reserved_count integer;
  BEGIN
    IF NOT has_permission(target_organization_id, 'invites.manage') THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('organization_invites:' || target_organization_id::text));

    SELECT array_agg(invitation.id) INTO resendable_ids
      FROM organization_invites AS invitation
      WHERE invitation.organization_id = target_organization_id
        AND invitation.id = ANY(invitation_ids)
        AND (invitation.status = 'canceled'
          OR (invitation.status = 'pending' AND invitation.expires_at <= now()));

    IF resendable_ids IS NULL THEN
      RETURN;
    END IF;

    -- Every resent invitation's link starts working again, so each takes a slot.
    member_limit := organization_member_limit(target_organization_id);
    IF member_limit IS NOT NULL THEN
      SELECT
          (SELECT count(*) FROM memberships WHERE organization_id = target_organization_id)
        + (SELECT count(*) FROM organization_invites
             WHERE organization_id = target_organization_id
               AND status = 'pending'
               AND expires_at > now())
        INTO reserved_count;
      IF reserved_count + cardinality(resendable_ids) > member_limit THEN
        RAISE EXCEPTION 'This organization has reached its member limit';
      END IF;
    END IF;

    RETURN QUERY
      WITH new_tokens AS (
        SELECT invitation.id, encode(extensions.gen_random_bytes(32), 'hex') AS token
          FROM organization_invites AS invitation
          WHERE invitation.id = ANY(resendable_ids)
      ),
      resent AS (
        UPDATE organization_invites AS invitation
          SET status = 'pending',
              token_hash = hash_invitation_token(new_tokens.token),
              expires_at = now() + interval '7 days'
          FROM new_tokens
          WHERE invitation.id = new_tokens.id
          RETURNING invitation.id, invitation.email, invitation.role, new_tokens.token
      )
      SELECT resent.id, resent.email, resent.role, resent.token FROM resent;
  END;
$$;

COMMENT ON FUNCTION resend_organization_invitations(uuid, uuid[]) IS 'Resends the given expired or canceled invitations, skipping any other ids, and returns each one''s address, role, and new token for the email. Needs invites.manage and room under the member cap.';

-- Cancels the given invitations whose link still works; any other ids are
-- skipped. The link already sent stops working at once.
CREATE OR REPLACE FUNCTION cancel_organization_invitations(
  target_organization_id uuid,
  invitation_ids uuid[]
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    canceled_count integer;
  BEGIN
    IF NOT has_permission(target_organization_id, 'invites.manage') THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE organization_invites
      SET status = 'canceled'
      WHERE organization_id = target_organization_id
        AND id = ANY(invitation_ids)
        AND status = 'pending'
        AND expires_at > now();

    GET DIAGNOSTICS canceled_count = ROW_COUNT;
    RETURN canceled_count;
  END;
$$;

COMMENT ON FUNCTION cancel_organization_invitations(uuid, uuid[]) IS 'Cancels the given pending invitations whose link still works, skipping any other ids, and returns how many it canceled. Needs invites.manage.';

-- What opening an invitation link shows, for whoever holds the link — signed
-- in or not. Holding the token is what entitles the caller to this; whether
-- the invited address has an account is answered only while the link still
-- works, and only about that address.
CREATE OR REPLACE FUNCTION get_organization_invitation_preview(invitation_token text) RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  invitee_email text,
  invitee_role organization_role,
  inviter_display_name text,
  inviter_first_name text,
  inviter_last_name text,
  invitation_state text,
  invitee_has_account boolean,
  viewer_email_matches boolean,
  viewer_is_member boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH invitation AS (
    SELECT
        invite.*,
        CASE
          WHEN invite.status = 'accepted' THEN 'accepted'
          WHEN invite.status = 'canceled' THEN 'canceled'
          WHEN invite.expires_at <= now() THEN 'expired'
          ELSE 'pending'
        END AS state
      FROM organization_invites AS invite
      WHERE invite.token_hash = hash_invitation_token(invitation_token)
  )
  SELECT
      invitation.organization_id,
      organization.name,
      invitation.email,
      invitation.role,
      inviter.display_name,
      inviter.first_name,
      inviter.last_name,
      invitation.state,
      CASE WHEN invitation.state = 'pending' THEN EXISTS (
        SELECT 1 FROM auth.users AS account WHERE lower(account.email) = invitation.email
      ) END,
      coalesce((
        SELECT lower(account.email) = invitation.email
          FROM auth.users AS account
          WHERE account.id = auth.uid()
      ), false),
      EXISTS (
        SELECT 1 FROM memberships AS membership
          WHERE membership.organization_id = invitation.organization_id
            AND membership.user_id = auth.uid()
      )
    FROM invitation
    JOIN organizations AS organization ON organization.id = invitation.organization_id
    LEFT JOIN member_profiles AS inviter ON inviter.id = invitation.invited_by;
$$;

COMMENT ON FUNCTION get_organization_invitation_preview(text) IS 'The organization, inviter, role, and state behind an invitation link, for its holder. Also whether the invited address has an account (only while the link works), and, when signed in, whether the viewer''s sign-in email matches and whether they already belong.';

-- Joins the signed-in user to the invitation's own organization — never one
-- the caller names — with the invitation's role. The sign-in email must match
-- the invited address, whatever the sign-in method.
--
-- Someone who already belongs is refused and their invitation left exactly as
-- it was, so the Admin's log can't reveal that the address was a member.
CREATE OR REPLACE FUNCTION accept_organization_invitation(invitation_token text) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
  DECLARE
    calling_user_id uuid := auth.uid();
    calling_user_email text;
    invitation organization_invites;
    member_limit integer;
  BEGIN
    IF calling_user_id IS NULL THEN
      RAISE EXCEPTION 'Not signed in';
    END IF;

    SELECT * INTO invitation
      FROM organization_invites
      WHERE token_hash = hash_invitation_token(invitation_token)
      FOR UPDATE;

    IF invitation.id IS NULL OR invitation.status <> 'pending' OR invitation.expires_at <= now() THEN
      RAISE EXCEPTION 'This invitation is no longer valid';
    END IF;

    SELECT lower(email) INTO calling_user_email FROM auth.users WHERE id = calling_user_id;
    IF calling_user_email IS DISTINCT FROM invitation.email THEN
      RAISE EXCEPTION 'This invitation is for a different email address';
    END IF;

    IF EXISTS (
      SELECT 1 FROM memberships
        WHERE organization_id = invitation.organization_id AND user_id = calling_user_id
    ) THEN
      RAISE EXCEPTION 'You already belong to this organization';
    END IF;

    -- The invitation already held a slot, but a plan can shrink while it waits.
    member_limit := organization_member_limit(invitation.organization_id);
    IF member_limit IS NOT NULL
      AND (SELECT count(*) FROM memberships WHERE organization_id = invitation.organization_id) >= member_limit
    THEN
      RAISE EXCEPTION 'This organization has reached its member limit';
    END IF;

    INSERT INTO memberships (user_id, organization_id, role, join_method)
    VALUES (calling_user_id, invitation.organization_id, invitation.role, 'email_invitation');

    UPDATE organization_invites
      SET status = 'accepted', accepted_at = now(), accepted_by = calling_user_id
      WHERE id = invitation.id;

    RETURN invitation.organization_id;
  END;
$$;

COMMENT ON FUNCTION accept_organization_invitation(text) IS 'Joins the signed-in user to the invitation''s organization with its role, if the link still works, their sign-in email matches, they don''t already belong, and the member cap allows. Marks it accepted and returns the organization''s id.';


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

DROP POLICY IF EXISTS "admins can view their organization's invites" ON organization_invites;
CREATE POLICY "admins can view their organization's invites" ON organization_invites
  FOR SELECT
  TO authenticated
  USING (has_permission(organization_id, 'invites.manage') OR is_platform_admin());


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

-- Internal to the invitation functions.
REVOKE ALL ON FUNCTION restrict_organization_invites_update()          FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION hash_invitation_token(text)                     FROM public, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION organization_member_limit(uuid)                 FROM public, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION send_organization_invitation(uuid, text, organization_role) FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION send_organization_invitation(uuid, text, organization_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION resend_organization_invitations(uuid, uuid[])   FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION resend_organization_invitations(uuid, uuid[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION cancel_organization_invitations(uuid, uuid[])   FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION cancel_organization_invitations(uuid, uuid[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION accept_organization_invitation(text)            FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION accept_organization_invitation(text)         TO authenticated, service_role;
-- Callable signed out too: the link's holder is who it answers for.
REVOKE ALL ON FUNCTION get_organization_invitation_preview(text)       FROM public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_organization_invitation_preview(text)    TO anon, authenticated, service_role;
