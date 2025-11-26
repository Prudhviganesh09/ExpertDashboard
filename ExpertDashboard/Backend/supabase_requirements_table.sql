-- Create requirements table in Supabase
-- This table stores client property requirements

CREATE TABLE IF NOT EXISTS requirements (
    id BIGSERIAL PRIMARY KEY,
    client_id TEXT NOT NULL,
    budget_min NUMERIC,
    budget_max NUMERIC,
    possession TEXT,
    configuration TEXT,
    locations TEXT,
    property_type TEXT,
    community_type TEXT,
    facing TEXT,
    building_type TEXT,
    floor_min INTEGER,
    floor_max INTEGER,
    size_min NUMERIC,
    size_max NUMERIC,
    financing_option TEXT,
    include_gst_registration BOOLEAN DEFAULT FALSE,
    matched_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on client_id for faster queries
CREATE INDEX IF NOT EXISTS idx_requirements_client_id ON requirements(client_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_requirements_created_at ON requirements(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can customize this based on your security needs)
CREATE POLICY "Allow all operations on requirements" ON requirements
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add a comment to the table
COMMENT ON TABLE requirements IS 'Stores client property requirements and search criteria';
