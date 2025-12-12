-- Migration: Add document_url and document_blob to leave_requests
ALTER TABLE IF EXISTS leave_requests
  ADD COLUMN IF NOT EXISTS document_url varchar(500),
  ADD COLUMN IF NOT EXISTS document_blob text;

-- Optional: set default values (none)

-- Done
