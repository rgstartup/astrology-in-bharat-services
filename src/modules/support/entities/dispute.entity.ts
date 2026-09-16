import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';

export enum DisputeStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity({ schema: 'support', name: 'support_disputes' })
export class Dispute {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => ClientAccount, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount | null;

  @Column({ name: 'client_id', type: 'int', nullable: true })
  client_id!: number | null;

  @ManyToOne(() => ProfileExpert, { nullable: true })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'expert_id', type: 'int', nullable: true })
  expert_id!: number | null;

  @ManyToOne('ChatSession', { nullable: true })
  @JoinColumn({ name: 'consultation_id' })
  consultation: any;

  @Column({ name: 'consultation_id', type: 'int', nullable: true })
  consultation_id!: number | null;

  @ManyToOne('Order', { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: any;

  @Column({ name: 'order_id', type: 'int', nullable: true })
  order_id!: number | null;

  @ManyToOne('PujaAppointment', { nullable: true })
  @JoinColumn({ name: 'puja_id' })
  puja: any;

  @Column({ name: 'puja_id', type: 'int', nullable: true })
  puja_id!: number | null;

  @Column({ type: 'varchar', length: 50, default: 'order' })
  type!: string;

  @Column({ name: 'item_id', type: 'int', nullable: true })
  item_id?: number;

  @Column({ type: 'varchar', length: 255 })
  category!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  status!: DisputeStatus;

  @Column({ type: 'json', nullable: true })
  item_details?: any;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
