-- Create client_requirements table
-- This table stores all requirements for each client with their matched properties
-- Each client (identified by mobile) can have multiple requirements

CREATE TABLE IF NOT EXISTS client_requirements (
    id SERIAL PRIMARY KEY,
    client_mobile VARCHAR(15) NOT NULL,
    requirement_number INTEGER NOT NULL,
    requirement_name VARCHAR(100) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    matched_properties JSONB NOT NULL DEFAULT '[]',
    shortlisted_properties JSONB DEFAULT '[]',
    site_visits JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(client_mobile, requirement_number)
);

-- Create index on client_mobile for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_mobile ON client_requirements(client_mobile);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_created_at ON client_requirements(created_at DESC);

-- Add comment to table
COMMENT ON TABLE client_requirements IS 'Stores client requirements with their preferences and matched properties';
COMMENT ON COLUMN client_requirements.client_mobile IS 'Client mobile number (acts as client identifier)';
COMMENT ON COLUMN client_requirements.requirement_number IS 'Sequential number for this client (1, 2, 3...)';
COMMENT ON COLUMN client_requirements.preferences IS 'JSON object containing budget, location, possession, configuration, etc.';
COMMENT ON COLUMN client_requirements.matched_properties IS 'JSON array of matched property objects';
COMMENT ON COLUMN client_requirements.shortlisted_properties IS 'JSON array of shortlisted property IDs';
COMMENT ON COLUMN client_requirements.site_visits IS 'JSON array of site visit information';
