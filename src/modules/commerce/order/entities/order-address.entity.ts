import {
  Entity,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { AddressType } from '@/common/enums/address-type.enum';

@Entity({ schema: 'commerce', name: 'order_addresses' })
export class OrderAddress {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'order_id', type: 'int' })
  order_id!: number;

  @ManyToOne(() => Order, (order) => order.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({
    type: 'enum',
    enum: AddressType,
    default: AddressType.SHIPPING,
  })
  address_type!: AddressType;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  full_name!: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone!: string;

  @Column({ name: 'alternate_phone', type: 'varchar', length: 20, nullable: true })
  alternate_phone!: string | null;

  @Column({ name: 'address_line_1', type: 'varchar', length: 255 })
  address_line_1!: string;

  @Column({ name: 'address_line_2', type: 'varchar', length: 255, nullable: true })
  address_line_2!: string | null;

  @Column({ name: 'landmark', type: 'varchar', length: 255, nullable: true })
  landmark!: string | null;

  @Column({ name: 'city', type: 'varchar', length: 100 })
  city!: string;

  @Column({ name: 'state', type: 'varchar', length: 100 })
  state!: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 20 })
  postal_code!: string;

  @Column({ name: 'country', type: 'varchar', length: 100, default: 'India' })
  country!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
