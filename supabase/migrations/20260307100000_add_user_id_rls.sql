-- Add user_id to all tables so each user has their own data
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all for projects" ON projects;
DROP POLICY IF EXISTS "Allow all for categories" ON categories;
DROP POLICY IF EXISTS "Allow all for tasks" ON tasks;

-- Projects: users can only see and manage their own rows
CREATE POLICY "Users own projects" ON projects
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Categories: users can only see and manage their own rows
CREATE POLICY "Users own categories" ON categories
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Tasks: users can only see and manage their own rows
CREATE POLICY "Users own tasks" ON tasks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Optional: index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
