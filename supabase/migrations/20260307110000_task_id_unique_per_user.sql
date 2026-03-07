-- Allow the same task_id for different users (unique per user instead of globally)
-- Fixes: duplicate key value violates unique constraint "tasks_task_id_key"

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_id_key;

-- Each user can have their own task_id 1, 2, 3, ...
CREATE UNIQUE INDEX tasks_user_id_task_id_key ON tasks (user_id, task_id) WHERE user_id IS NOT NULL;
