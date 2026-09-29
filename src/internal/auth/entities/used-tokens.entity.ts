import type { Relation } from 'typeorm';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { createHash } from 'crypto';

@Entity({
  schema: 'auth',
})
@Unique(['user', 'token'])
export class UsedTokens {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @Column('text')
  token!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  purpose!: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  used_at!: Date;

  @BeforeInsert()
  hashToken() {
    this.token = createHash('sha256').update(this.token).digest('hex');
  }
}
