import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { createHash } from 'crypto';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({
  schema: 'auth',
})
@Unique(['user', 'token'])
export class UsedTokens {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

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
