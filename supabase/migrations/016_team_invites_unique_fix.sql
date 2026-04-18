-- 015 created the unique index as (team_id, lower(email)) which, being
-- expression-based, can't be targeted by `INSERT ... ON CONFLICT (team_id, email)`.
-- Replace it with a plain composite unique index. The route that writes
-- invites lowercases email beforehand, so case-insensitivity is preserved
-- by the write path.

DROP INDEX IF EXISTS team_invites_team_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS team_invites_team_email_key
  ON team_invites (team_id, email);
