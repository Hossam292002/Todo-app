-- Add display_id for project-based task IDs (e.g. AS-1, GEN-2)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS display_id TEXT;

-- Backfill existing rows
UPDATE tasks SET display_id = 'GEN-' || task_id WHERE display_id IS NULL;

-- Now require and unique per user
ALTER TABLE tasks ALTER COLUMN display_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_display_id_key ON tasks (user_id, display_id) WHERE user_id IS NOT NULL;
