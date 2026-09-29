import type { Relation } from 'typeorm';
import { ClientAccount } from '../../account/entities/account.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { FavoriteItemType } from '../enum';

@Entity({ schema: 'client', name: 'favorites' })
export class Favorites {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'client_id' })
  client_id!: number;

  @ManyToOne(() => ClientAccount)
  @JoinColumn({ name: 'client_id' })
  client!: Relation<ClientAccount>;

  @Column({ name: 'item_type', type: 'enum', enum: FavoriteItemType })
  item_type!: FavoriteItemType;

  @Column({ name: 'item_id', type: 'int' })
  item_id!: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;
}
