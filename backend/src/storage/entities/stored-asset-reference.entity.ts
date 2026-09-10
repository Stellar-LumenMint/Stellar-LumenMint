import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * A per-uploader reference to a stored asset.
 *
 * Storage is deduplicated by content hash, so the `stored_assets` row keeps
 * the identity of whichever account uploaded the bytes first. Returning that
 * row unchanged to a second uploader silently discards their metadata and
 * attributes the asset to someone else. This table records one reference per
 * (asset, uploader) pair so every uploader keeps their own provenance while
 * the bytes on IPFS/Arweave are still stored once.
 */
@Entity('stored_asset_references')
@Index('idx_stored_asset_references_asset', ['assetId'])
@Index('idx_stored_asset_references_uploader', ['uploadedBy'])
@Index('uq_stored_asset_references_asset_uploader', ['assetId', 'uploadedBy'], {
  unique: true,
})
export class StoredAssetReference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'asset_id', type: 'uuid' })
  assetId: string;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 255 })
  uploadedBy: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
