-- Category color: chosen when creating category, applied to all tasks in that category
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'emerald';
