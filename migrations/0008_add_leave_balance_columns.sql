-- Migration: add leave balance columns to employees
BEGIN;

ALTER TABLE IF EXISTS employees
  ADD COLUMN IF NOT EXISTS casual_leave integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS sick_leave integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS earned_leave integer DEFAULT 15;

-- Ensure NOT NULL for new columns with a default (safe for tables without rows)
ALTER TABLE IF EXISTS employees
  ALTER COLUMN casual_leave SET NOT NULL,
  ALTER COLUMN sick_leave SET NOT NULL,
  ALTER COLUMN earned_leave SET NOT NULL;

COMMIT;
