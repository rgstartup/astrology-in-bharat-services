import {
    Entity,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { PrimaryKeyColumn } from '@/common/decorators/primary-key.decorator';

@Entity({ schema: 'agent', name: 'listings' })
export class AgentListing {
    @PrimaryKeyColumn()
    id!: string;

    @Column({ type: 'varchar', length: 20 })
    type!: string; // 'mandir' | 'puja_shop'

    @Column({type: 'text'})
    name!: string;

    @Column({type: 'text', nullable: true })
    location!: string | null;

    @Column({type: 'character varying', length: 100, nullable: true })
    phone!: string | null;

    @Column({type: 'text', nullable: true })
    deity!: string | null; // main deity (mandir) or specialty (puja shop)

    @Column({type: 'text', nullable: true })
    items!: string | null; // timing info or items sold

    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status!: string; // 'pending' | 'approved' | 'rejected'

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'agent_id' })
    agent!: User;

    @Column({type: 'uuid'})
    agent_id!: string;

    @CreateDateColumn({type: 'timestamptz'})
    created_at!: Date;

    @UpdateDateColumn({type: 'timestamptz'})
    updated_at!: Date;
}
