import {
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { CartItem } from './cart-item.entity';

@Entity({ schema: 'commerce', name: 'carts' })
export class Cart {
  @PrimaryGeneratedColumn()
  id!: number;

  @OneToOne(() => ClientAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: ClientAccount;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, { cascade: true })
  items!: CartItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at!: Date;
}
