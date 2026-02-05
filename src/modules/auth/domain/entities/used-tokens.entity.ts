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
import { User } from '@/modules/users';
import { createHash } from 'crypto';

@Entity()
@Unique(['user', 'token'])
export class UsedTokens {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('text')
  token: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  purpose: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  used_at: Date;

  @BeforeInsert()
  hashToken() {
    this.token = createHash('sha256').update(this.token).digest('hex');
  }
}

