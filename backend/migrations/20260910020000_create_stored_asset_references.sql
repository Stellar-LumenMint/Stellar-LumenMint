-- Per-uploader references to deduplicated stored assets.
-- Storage dedupes by content hash, so the stored_assets row belongs to the
-- first uploader. This table keeps one reference per (asset, uploader) pair so
-- later uploaders of identical bytes retain their own metadata and attribution
-- instead of being handed the original uploader's record.
CREATE TABLE IF NOT EXISTS stored_asset_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES stored_assets(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stored_asset_references_asset_uploader
        UNIQUE (asset_id, uploaded_by)
);

CREATE INDEX IF NOT EXISTS idx_stored_asset_references_asset
    ON stored_asset_references(asset_id);

CREATE INDEX IF NOT EXISTS idx_stored_asset_references_uploader
    ON stored_asset_references(uploaded_by);
