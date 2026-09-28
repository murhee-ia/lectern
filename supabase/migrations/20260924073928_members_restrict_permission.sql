-- Adds the permission to restrict a member, alone in its own migration.
-- Written idempotently, so that this migration can be re-run without error.

ALTER TYPE app_permission ADD VALUE IF NOT EXISTS 'members.restrict' AFTER 'members.remove';
