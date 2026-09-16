import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

export enum OtpPurposeEnum {
  REGISTRATION = 'registration',
  FORGOT_PASSWORD = 'forgot_password',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
}

@Entity({
  schema: 'auth',
  name: 'otp',
})
export class Otp {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Index()
  @Column({ type: 'character varying', length: 255 })
  email!: string;

  @Column({ type: 'character varying', length: 255 })
  otp!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: OtpPurposeEnum.REGISTRATION,
  })
  purpose!: string;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
