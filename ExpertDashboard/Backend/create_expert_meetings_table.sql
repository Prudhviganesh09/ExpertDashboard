-- Create expert_meetings table in Supabase
CREATE TABLE IF NOT EXISTS expert_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    expert_email TEXT NOT NULL,
    expert_name TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 45,
    status TEXT NOT NULL DEFAULT 'scheduled',
    google_calendar_event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expert_meetings_client_id ON expert_meetings(client_id);
CREATE INDEX IF NOT EXISTS idx_expert_meetings_expert_email ON expert_meetings(expert_email);
CREATE INDEX IF NOT EXISTS idx_expert_meetings_start_time ON expert_meetings(start_time);
CREATE INDEX IF NOT EXISTS idx_expert_meetings_status ON expert_meetings(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_expert_meetings_updated_at
    BEFORE UPDATE ON expert_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE expert_meetings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can customize this based on your auth requirements)
CREATE POLICY "Allow all operations on expert_meetings"
ON expert_meetings
FOR ALL
USING (true)
WITH CHECK (true);
