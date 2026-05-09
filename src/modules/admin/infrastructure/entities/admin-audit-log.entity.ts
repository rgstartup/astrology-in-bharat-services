import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Entity('admin_audit_logs')
export class AdminAuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'admin_id' })
    admin_id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'admin_id' })
    admin: User;

    @Column()
    action: string; // e.g., 'APPROVE_WITHDRAWAL', 'REJECT_WITHDRAWAL'

    @Column()
    resource_type: string; // e.g., 'WITHDRAWAL'

    @Column({ nullable: true })
    resource_id: string;

    @Column({ type: 'json', nullable: true })
    details: any;

    @Column({ name: 'ip_address', nullable: true })
    ip_address: string;

    @CreateDateColumn({ name: 'created_at' })
    created_at: Date;
}
