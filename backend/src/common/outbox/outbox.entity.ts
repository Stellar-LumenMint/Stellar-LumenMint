// ── Outbox Entity ────────────────────────────────────────────────────────────

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/** Status of an outbox event. */
export type OutboxStatus = 'pending' | 'published' | 'failed' | 'archived';

@Entity('outbox_events')
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** The event type (e.g. 'nft.created', 'auction.settled'). */
  @Column({ type: 'varchar', length: 255 })
  @Index()
  eventType!: string;

  /** The aggregate ID this event belongs to. */
  @Column({ type: 'varchar', length: 255 })
  @Index()
  aggregateId!: string;

  /** JSON payload of the event. */
  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  /** Current status. */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: OutboxStatus;

  /** Number of publication attempts. */
  @Column({ type: 'int', default: 0 })
  attempts!: number;

  /** When to retry next (if failed). */
  @Column({ type: 'timestamptz', nullable: true })
  nextRetryAt?: Date;

  /** Last error message, if any. */
  @Column({ type: 'text', nullable: true })
  lastError?: string;

  /** When the event was created (inserted into outbox). */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /** When the status was last changed. */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  /** When the event was published (nullable — set on success). */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;
}
