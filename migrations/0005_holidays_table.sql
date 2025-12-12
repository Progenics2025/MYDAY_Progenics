-- Migration: create holidays table

DROP TABLE IF EXISTS holidays;

CREATE TABLE holidays (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'Mandatory',
  applies_to TEXT NOT NULL DEFAULT 'All',
  icon_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
