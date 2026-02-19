import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('agent_otps')
export class AgentOtp {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    otp: string;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    @Column({ default: false })
    verified: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
