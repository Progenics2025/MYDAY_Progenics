-- Migration: Add location tracking tables for field sales tracking
-- Created: 2026-01-17

-- Table: location_trails
-- Stores periodic GPS locations recorded during work hours
CREATE TABLE IF NOT EXISTS location_trails (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    attendance_id VARCHAR(36) REFERENCES attendance(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    accuracy DECIMAL(10,2),
    altitude DECIMAL(10,2),
    speed DECIMAL(10,2),
    heading DECIMAL(5,2),
    battery_level INTEGER,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient queries by employee and time
CREATE INDEX IF NOT EXISTS idx_location_trails_employee_time ON location_trails(employee_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_location_trails_attendance ON location_trails(attendance_id);

-- Table: visits
-- Stores detected visits (when user stays at a location for 5+ minutes)
CREATE TABLE IF NOT EXISTS visits (
    id VARCHAR(36) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    attendance_id VARCHAR(36) REFERENCES attendance(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    address TEXT,
    place_name VARCHAR(255),
    arrival_time TIMESTAMP NOT NULL,
    departure_time TIMESTAMP,
    duration_minutes INTEGER,
    visit_type VARCHAR(50) DEFAULT 'unknown', -- 'client', 'office', 'break', 'unknown'
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_visits_employee_time ON visits(employee_id, arrival_time DESC);
CREATE INDEX IF NOT EXISTS idx_visits_attendance ON visits(attendance_id);

-- Add comments
COMMENT ON TABLE location_trails IS 'Stores periodic GPS locations for field tracking (like Uber driver tracking)';
COMMENT ON TABLE visits IS 'Stores detected client/location visits with duration and notes';
