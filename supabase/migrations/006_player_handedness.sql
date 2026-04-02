-- Add bats/throws handedness columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS bats TEXT DEFAULT 'Right' CHECK (bats IN ('Right', 'Left', 'Switch'));
ALTER TABLE players ADD COLUMN IF NOT EXISTS throws TEXT DEFAULT 'Right' CHECK (throws IN ('Right', 'Left'));
