import {
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { CartItem } from './cart-item.entity';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'commerce', name: 'carts' })
export class Cart {
  @UuidPrimaryKeyColumn()
  id!: string;

  @OneToOne(() => ProfileClient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient;

  @Column({ name: 'client_id', type: 'uuid', unique: true, nullable: true })
  client_id!: string;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, { cascade: true })
  items!: CartItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
