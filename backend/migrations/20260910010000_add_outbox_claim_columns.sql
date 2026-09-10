-- Outbox relay claim columns
-- The relay worker atomically claims rows by flipping status to
-- 'publishing' and stamping claimed_at, so multiple app instances cannot
-- publish the same event. A stale claim is reclaimed after a crash.
ALTER TABLE outbox_events
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created
    ON outbox_events(status, created_at);
