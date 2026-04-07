-- Add split squad columns to practice_plan_items
ALTER TABLE practice_plan_items ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT false;
ALTER TABLE practice_plan_items ADD COLUMN IF NOT EXISTS stations JSONB;
