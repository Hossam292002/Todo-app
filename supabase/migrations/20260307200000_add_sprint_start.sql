-- Add sprint_start to tasks: Monday of the sprint week (ISO date)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sprint_start DATE;

COMMENT ON COLUMN tasks.sprint_start IS 'Monday of the sprint week (full week Mon–Sun)';
