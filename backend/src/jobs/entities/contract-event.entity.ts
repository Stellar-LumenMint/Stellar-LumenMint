import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('contract_events')
@Index(['txHash', 'eventIndex'], { unique: true })
export class ContractEvent {
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

  @Column({ nullable: true })
  topic: string;

  @Column({ name: 'event_type', nullable: true })
  eventType: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
