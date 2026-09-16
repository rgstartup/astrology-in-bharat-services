import { Entity, Column, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

@Entity({
  schema: 'auth',
  name: 'oauth_accounts',
})
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'character varying', length: 255 })
  provider!: string;

  @Column({ type: 'character varying', length: 255 })
  provider_id!: string;

  @Column({ nullable: true, type: 'text' })
  email!: string | null;

  @ManyToOne(() => User, (u) => u.oauth_accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
