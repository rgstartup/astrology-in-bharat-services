import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Entity('agent_listings')
export class AgentListing {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 20 })
    type: string; // 'mandir' | 'puja_shop'

    @Column()
    name: string;

    @Column({ nullable: true })
    location: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    deity: string; // main deity (mandir) or specialty (puja shop)

    @Column({ nullable: true })
    items: string; // timing info or items sold

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: string; // 'pending' | 'approved' | 'rejected'

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'agent_id' })
    agent: User;

    @Column()
    agent_id: number;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
