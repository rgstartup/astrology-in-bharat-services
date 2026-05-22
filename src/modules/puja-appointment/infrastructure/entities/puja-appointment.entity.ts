import {
  Entity,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ExpertPuja } from '@/modules/expert/profile/infrastructure/entities/expert-puja.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

export enum PujaAppointmentStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ON_HOLD = 'on_hold',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum PujaMode {
    ONLINE = 'online',
    HOME_VISIT_WITH = 'home_visit_with',
    HOME_VISIT_WITHOUT = 'home_visit_without',
}

@Entity({ schema: 'consultations', name: 'puja_appointments' })
export class PujaAppointment {
  @PrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ProfileClient)
  @JoinColumn({ name: 'client_id' })
  client!: ProfileClient;

  @Column({ type: 'uuid', name: 'client_id' })
  client_id!: string;

  @ManyToOne(() => ProfileExpert)
  @JoinColumn({ name: 'expert_id' })
  expert!: ProfileExpert;

  @Column({ type: 'uuid' })
  expert_id!: string;

  @ManyToOne(() => ExpertPuja)
  @JoinColumn({ name: 'puja_id' })
  puja!: ExpertPuja;

  @Column({ type: 'uuid' })
  puja_id!: string;

  @Column({ type: 'date', nullable: true, name: 'scheduled_date' })
  scheduled_date!: string | Date | null;

  @Column({ type: 'time', nullable: true, name: 'scheduled_time' })
  scheduled_time!: string | null;

  @Column({ type: 'boolean', default: false, name: 'ask_expert_for_date' })
  ask_expert_for_date!: boolean;

  @Column({
    type: 'enum',
    enum: PujaAppointmentStatus,
    default: PujaAppointmentStatus.PENDING,
  })
  status!: PujaAppointmentStatus;

  @Column({
    type: 'enum',
    enum: PujaMode,
    default: PujaMode.ONLINE,
  })
  mode!: PujaMode;

  @Column({ type: 'float', default: 0, name: 'price' })
  price!: number;

  @Column({ type: 'text', nullable: true, name: 'user_message' })
  user_message!: string | null;

  @Column({ type: 'text', nullable: true, name: 'expert_message' })
  expert_message!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at!: Date;
}
