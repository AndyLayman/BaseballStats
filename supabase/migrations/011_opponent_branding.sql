-- Opponent branding: logo SVG and team colors
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_logo_svg TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_color_fg TEXT DEFAULT '#ffffff';
ALTER TABLE games ADD COLUMN IF NOT EXISTS opponent_color_bg TEXT DEFAULT '#000000';
