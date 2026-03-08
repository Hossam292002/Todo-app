-- Run this in Supabase Dashboard → SQL Editor (for the project in your .env.local).
-- Run the whole script once. If you see "already exists" errors for some lines, that's OK.

-- 1) Add user_id and RLS (if missing)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Allow all for projects" ON projects;
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Allow all for tasks" ON tasks;

DROP POLICY IF EXISTS "Users own projects" ON projects;
DROP POLICY IF EXISTS "Users own categories" ON categories;
DROP POLICY IF EXISTS "Users own tasks" ON tasks;

CREATE POLICY "Users own projects" ON projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own categories" ON categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users own tasks" ON tasks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- 2) task_id unique per user (not globally)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_id_key;
DROP INDEX IF EXISTS tasks_user_id_task_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_task_id_key ON tasks (user_id, task_id) WHERE user_id IS NOT NULL;

-- 3) display_id (e.g. AS-1, GEN-2)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS display_id TEXT;
UPDATE tasks SET display_id = COALESCE(display_id, 'GEN-' || task_id) WHERE display_id IS NULL OR display_id = '';
ALTER TABLE tasks ALTER COLUMN display_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN display_id SET DEFAULT 'GEN-1';
UPDATE tasks SET display_id = COALESCE(display_id, 'GEN-' || task_id) WHERE display_id IS NULL OR display_id = '';
ALTER TABLE tasks ALTER COLUMN display_id SET NOT NULL;
DROP INDEX IF EXISTS tasks_user_id_display_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_display_id_key ON tasks (user_id, display_id) WHERE user_id IS NOT NULL;

-- 4) Category color
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'emerald';

-- 5) Sprint (Monday of week)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_start DATE;

-- 6) Task attachment (image)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
