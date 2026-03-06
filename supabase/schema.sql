-- Supabase Schema for Todo Application
-- Run this in Supabase SQL Editor to create tables

-- Projects table (unique Project ID)
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (columns on canvas)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  width INTEGER DEFAULT 280,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  task_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  project_id TEXT REFERENCES projects(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-increment task_id trigger
CREATE OR REPLACE FUNCTION get_next_task_id()
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(task_id), 0) + 1 FROM tasks;
$$ LANGUAGE SQL;

-- Enable RLS (Row Level Security)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (adjust for your auth setup)
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
