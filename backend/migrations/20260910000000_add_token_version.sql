-- Add token_version to users
-- Bumped whenever outstanding tokens must be invalidated (password
-- change, forced logout, ban). Tokens embed the version at issue time
-- and are rejected on refresh if it no longer matches.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;