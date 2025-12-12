-- Migration: add password reset tokens table and must_reset_password flag on users
BEGIN;

-- Add a boolean to users to indicate forced reset on next login
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false;

-- Create table to store password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

COMMIT;
