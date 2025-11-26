-- Migration: Add client_email column to expert_meetings
-- Adds a nullable client_email column so scheduled meeting rows store the client's email address

ALTER TABLE IF EXISTS expert_meetings
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Create an index for quick lookups by client_email
CREATE INDEX IF NOT EXISTS idx_expert_meetings_client_email ON expert_meetings(client_email);
