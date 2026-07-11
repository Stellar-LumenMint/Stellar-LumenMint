import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type DlqStatus = 'pending' | 'retrying' | 'exhausted' | 'resolved';

@Entity('contract_event_dlq')
export class ContractEventDlq {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'contract_id' })
  contractId: string;

  @Column()
  ledger: number;

  @Column({ name: 'tx_hash' })
  txHash: string;

  @Column({ name: 'event_index' })
  eventIndex: number;

  @Column({ name: 'event_type', nullable: true })
  eventType: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  stack: string;

  @Column({ name: 'attempt_count', default: 0 })
  attemptCount: number;

  @Column({ name: 'first_failed_at', type: 'timestamp' })
  firstFailedAt: Date;

  @Column({ name: 'last_failed_at', type: 'timestamp' })
  lastFailedAt: Date;

  @Column({ name: 'next_retry_at', type: 'timestamp' })
  nextRetryAt: Date;

  @Column({ type: 'varchar', default: 'pending' })
  status: DlqStatus;
}
