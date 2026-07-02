import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export type ProfileType = Exclude<RoleEnum, RoleEnum.ADMIN>;

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_PLACED = 'order_placed',
  ORDER_PACKED = 'order_packed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  WALLET_RECHARGE = 'wallet_recharge',
  PUJA_BOOKING = 'puja_booking',
  GENERAL = 'general',
}

@Entity({ schema: 'support', name: 'notifications' })
export class Notification {
  @UuidPrimaryKeyColumn()
  id!: string;

  @Column({ name: 'client_id', type: 'uuid', nullable: true })
  client_id!: string | null;

  @ManyToOne(() => ProfileClient, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient | null;

  @Column({ name: 'expert_id', type: 'uuid', nullable: true })
  expert_id!: string | null;

  @ManyToOne(() => ProfileExpert, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert | null;

  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  merchant_id!: string | null;

  @ManyToOne(() => ProfileMerchant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: ProfileMerchant | null;

  @Column({ name: 'agent_id', type: 'uuid', nullable: true })
  agent_id!: string | null;

  @ManyToOne(() => ProfileAgent, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent!: ProfileAgent | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.GENERAL,
    nullable: true,
  })
  type!: NotificationType | null;

  @Column({ type: 'character varying', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'is_read', default: false })
  is_read!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>; // orderId, etc.

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
