import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OtpPurposeEnum } from '../enums/otp-purpose.enum';

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
