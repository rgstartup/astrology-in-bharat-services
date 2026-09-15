import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UuidPrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';
import { ExpertAccount } from './account.entity';
import { AstrologyService } from '@/modules/astrology/entities/astrology-service.entity';

@Entity({ schema: 'expert', name: 'expert_astrology_services' })
@Unique(['expert_id', 'service_id'])
export class ExpertAstrologyService {
  @UuidPrimaryKeyColumn()
  id!: string;

  @ManyToOne(() => ExpertAccount, (ea) => ea.astrology_services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'expert_id' })
  expert!: ExpertAccount;

  @Column({ type: 'uuid' })
  expert_id!: string;

  @ManyToOne(() => AstrologyService, (s) => s.expert_services, {
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_id' })
  service!: AstrologyService;

  @Column({ type: 'uuid' })
  service_id!: string;

  @Column({ type: 'float', default: 0 })
  price!: number;

  @Column({ type: 'bool', default: true })
  is_enabled!: boolean;

  @Column({ type: 'simple-array', nullable: true })
  languages!: string[] | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
