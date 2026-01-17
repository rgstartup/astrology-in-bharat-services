import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('festivals')
export class Festival {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'timestamptz' })
    date: Date;

    @Column({ default: 'festival' }) // e.g., 'festival', 'holiday', 'event'
    type: string;

    @Column({ nullable: true })
    image_url: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
