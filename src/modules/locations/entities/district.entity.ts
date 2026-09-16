import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StateEntity } from './state.entity';

@Entity('districts')
export class DistrictEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'int' })
  state_id: number;

  @ManyToOne(() => StateEntity, state => state.districts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'state_id' })
  state: StateEntity;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
