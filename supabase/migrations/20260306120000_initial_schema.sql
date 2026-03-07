-- Projects table (unique Project ID)
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table (columns on canvas)
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  width INTEGER DEFAULT 280,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
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

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policies for anon access
CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
