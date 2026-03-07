-- Add optional image attachment (data URL or URL) for tasks (paste support)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;

COMMENT ON COLUMN tasks.attachment_url IS 'Pasted image as data URL or uploaded image URL';
