import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

@Entity({ schema: 'expert', name: 'todos' })
export class Todo {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({type: 'text'})
    text!: string;

    @Column({ type: 'bool', default: false })
    completed!: boolean;

    @ManyToOne(() => ProfileExpert, { onDelete: 'CASCADE' })
    expert!: ProfileExpert;

    @Column({ type: 'int', name: 'expert_id' })
    expert_id!: number;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    created_at!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updated_at!: Date;
}
