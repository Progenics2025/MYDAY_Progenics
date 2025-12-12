-- Fix migration: use varchar for user_id to match existing users.id type
BEGIN;

ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS must_reset_password boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id serial PRIMARY KEY,
  user_id varchar(255) NOT NULL,
  token varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

COMMIT;
