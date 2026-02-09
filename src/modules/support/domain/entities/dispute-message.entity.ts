import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Dispute } from './dispute.entity';

export enum SenderType {
    USER = 'user',
    ADMIN = 'admin',
}

export enum AttachmentType {
    IMAGE = 'image',
    DOCUMENT = 'document',
    PDF = 'pdf',
}

@Entity('dispute_messages')
export class DisputeMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Dispute, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'dispute_id' })
    dispute: Dispute;

    @Column({ name: 'dispute_id' })
    disputeId: number;

    @Column({ type: 'enum', enum: SenderType })
    senderType: SenderType;

    @Column()
    senderId: number;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ nullable: true, length: 500 })
    attachmentUrl: string;

    @Column({ type: 'enum', enum: AttachmentType, nullable: true })
    attachmentType: AttachmentType;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
