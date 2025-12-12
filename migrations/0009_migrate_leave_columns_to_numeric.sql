-- Migration 0009: Convert leave columns to numeric(5,1)
-- Backup and test on a dev DB before running in production.
-- This migration will convert casual_leave, sick_leave, and earned_leave from integer to numeric(5,1)
-- It will also update default values to match the numeric type.

BEGIN;

-- 1) Add temporary columns with the new numeric type
ALTER TABLE employees ADD COLUMN casual_leave_new numeric(5,1) DEFAULT 12.0;
ALTER TABLE employees ADD COLUMN sick_leave_new numeric(5,1) DEFAULT 12.0;
ALTER TABLE employees ADD COLUMN earned_leave_new numeric(5,1) DEFAULT 15.0;

-- 2) Copy existing values into the new columns (casting integers to numeric preserves values)
UPDATE employees SET casual_leave_new = casual_leave::numeric(5,1);
UPDATE employees SET sick_leave_new = sick_leave::numeric(5,1);
UPDATE employees SET earned_leave_new = earned_leave::numeric(5,1);

-- 3) Drop old columns
ALTER TABLE employees DROP COLUMN casual_leave;
ALTER TABLE employees DROP COLUMN sick_leave;
ALTER TABLE employees DROP COLUMN earned_leave;

-- 4) Rename new columns to original names
ALTER TABLE employees RENAME COLUMN casual_leave_new TO casual_leave;
ALTER TABLE employees RENAME COLUMN sick_leave_new TO sick_leave;
ALTER TABLE employees RENAME COLUMN earned_leave_new TO earned_leave;

-- 5) Ensure non-null and defaults are set (adjust as appropriate for your policies)
ALTER TABLE employees ALTER COLUMN casual_leave SET DEFAULT 12.0;
ALTER TABLE employees ALTER COLUMN sick_leave SET DEFAULT 12.0;
ALTER TABLE employees ALTER COLUMN earned_leave SET DEFAULT 15.0;

COMMIT;

-- Note: if your environment uses a migrations tool, convert this into the tool's format (timestamped file or up/down SQL). Always backup the DB and test in a staging environment.
