import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '@/modules/users/infrastructure/entities/user.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export class ColumnNumericTransformer {
  to(data: number): number {
    return data;
  }
  from(data: string): number {
    return Number.parseFloat(data);
  }
}

@Entity({ schema: 'finance', name: 'payment_orders' })
export class PaymentOrder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', name: 'user_id', nullable: true })
  user_id!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'razorpay_order_id', type: 'text', unique: true, nullable: true })
  razorpay_order_id!: string | null;

  @Column({ name: 'razorpay_payment_id', type: 'text', unique: true, nullable: true })
  razorpay_payment_id!: string | null;

  @Column({ name: 'razorpay_signature', type: 'text', nullable: true })
  razorpay_signature!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  amount!: number;

  @Column({ default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'json', nullable: true })
  notes: any;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
