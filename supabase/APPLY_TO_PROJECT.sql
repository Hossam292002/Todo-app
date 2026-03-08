-- Run this in Supabase Dashboard → SQL Editor (for the project in your .env.local)
-- Use the project whose URL is in NEXT_PUBLIC_SUPABASE_URL. Run the whole script once.

-- ========== 1. Create tables if they don't exist (for brand-new projects) ==========
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  width INTEGER DEFAULT 280,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  color TEXT DEFAULT 'emerald'
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  project_id TEXT REFERENCES projects(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  display_id TEXT,
  sprint_start DATE,
  attachment_url TEXT
);

-- ========== 2. Add any missing columns (for existing projects) ==========
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'emerald';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_start DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Backfill display_id for existing rows
UPDATE tasks SET display_id = 'GEN-' || task_id WHERE display_id IS NULL AND task_id IS NOT NULL;

-- ========== 3. Row Level Security ==========
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Remove old permissive policies if they exist
DROP POLICY IF EXISTS "Allow all for projects" ON projects;
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Allow all for tasks" ON tasks;

-- Create per-user policies
DROP POLICY IF EXISTS "Users own projects" ON projects;
CREATE POLICY "Users own projects" ON projects FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users own categories" ON categories;
CREATE POLICY "Users own categories" ON categories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users own tasks" ON tasks;
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========== 4. Indexes and constraints ==========
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- task_id: unique per user (drop global unique if exists)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_id_key;
DROP INDEX IF EXISTS tasks_user_id_task_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_task_id_key ON tasks (user_id, task_id) WHERE user_id IS NOT NULL;

-- display_id: unique per user
DROP INDEX IF EXISTS tasks_user_id_display_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS tasks_user_id_display_id_key ON tasks (user_id, display_id) WHERE user_id IS NOT NULL;
