import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
} from 'typeorm';
import { ProfileExpert } from './profile-expert.entity';

@Entity('expert_todos')
export class Todo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    text: string;

    @Column({ default: false })
    completed: boolean;

    @ManyToOne(() => ProfileExpert, { onDelete: 'CASCADE' })
    expert: ProfileExpert;

    @Column()
    expertId: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
