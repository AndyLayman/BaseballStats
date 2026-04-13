-- Per-pitch tracking: one row for every ball, strike, or foul
CREATE TABLE pitches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  opponent_batter_id UUID REFERENCES opponent_lineup(id) ON DELETE SET NULL,
  team TEXT NOT NULL CHECK (team IN ('us', 'them')),
  inning INTEGER NOT NULL,
  half TEXT NOT NULL CHECK (half IN ('top', 'bottom')),
  pitch_type TEXT NOT NULL CHECK (pitch_type IN ('ball', 'strike', 'foul')),
  pitch_num INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pitches_game ON pitches(game_id);
CREATE INDEX idx_pitches_player ON pitches(player_id);
CREATE INDEX idx_pitches_opponent ON pitches(opponent_batter_id);
