-- Pending invites for a team. Rows are keyed by (team_id, lower(email)).
-- When an invitee signs up and AuthProvider claims the invite, the row is
-- deleted and a matching team_members row is inserted.

CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','manager','teammate','parent','guest')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness per team
CREATE UNIQUE INDEX IF NOT EXISTS team_invites_team_email_key
  ON team_invites (team_id, lower(email));

-- Lookup index for the claim-on-signup flow
CREATE INDEX IF NOT EXISTS team_invites_email_idx
  ON team_invites (lower(email));

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Admins of the team can see and manage its invites
CREATE POLICY "team admins can read invites"
  ON team_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invites.team_id
        AND team_members.user_id = auth.uid()
        AND team_members.role = 'admin'
    )
  );

-- Invited users can read their own pending invites (for the claim flow).
-- Compare against auth.users.email case-insensitively.
CREATE POLICY "invitees can read their own invites"
  ON team_invites FOR SELECT
  USING (
    lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Writes are done by the service role from our /api/team/invite route,
-- so no client-side insert/update/delete policies are needed. (Service
-- role bypasses RLS.)
