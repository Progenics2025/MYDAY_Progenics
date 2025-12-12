-- Migration: add new employee columns for additional profile fields
BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS skills jsonb,
  ADD COLUMN IF NOT EXISTS profile_photo_url varchar(500);

COMMIT;
