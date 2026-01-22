import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from './entities/chat-session.entity';
import { ChatMessage, MessageType } from './entities/chat-message.entity';
import { WalletService } from '@/modules/wallet/wallet.service';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class ChatService {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(ChatMessage)
        private messageRepo: Repository<ChatMessage>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
        private walletService: WalletService,
    ) { }

    async getSession(id: number) {
        return this.sessionRepo.findOne({
            where: { id },
            relations: ['user']
        });
    }

    async getPendingSessionsForExpert(expertId: number) {
        const { MoreThan } = await import('typeorm');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        return this.sessionRepo.find({
            where: [
                { expertId, status: ChatSessionStatus.PENDING },
                { expertId, status: ChatSessionStatus.ACTIVE },
                { expertId, status: ChatSessionStatus.COMPLETED, createdAt: MoreThan(oneHourAgo) },
                { expertId, status: ChatSessionStatus.EXPIRED, createdAt: MoreThan(oneHourAgo) },
            ],
            relations: ['user'],
            order: { createdAt: 'DESC' },
        });
    }

    async getPendingSessionsByExpertUser(userId: number) {
        const expert = await this.expertRepo.findOne({ where: { user: { id: userId } } });
        if (!expert) {
            return [];
        }
        return this.getPendingSessionsForExpert(expert.id);
    }

    async initiateChat(userId: number, expertId: number) {
        const expert = await this.expertRepo.findOne({
            where: { id: expertId },
        });

        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        const chatPrice = expert.chat_price || 0;
        const minMins = 5;
        const minBalanceRequired = chatPrice * minMins;

        const hasBalance = await this.walletService.validateBalance(userId, minBalanceRequired);
        if (!hasBalance) {
            throw new BadRequestException(`Insufficient balance. Minimum ${minMins} minutes (₹${minBalanceRequired}) balance is required to start chat.`);
        }

        const session = this.sessionRepo.create({
            userId,
            expertId,
            pricePerMinute: chatPrice,
            status: ChatSessionStatus.PENDING,
        });

        const savedSession = await this.sessionRepo.save(session);

        // Hold balance
        await this.walletService.reserveBalance(userId, minBalanceRequired, `chat_${savedSession.id}`);

        // Fetch again with relations to ensure 'user' (client) info is included for the expert dashboard
        const sessionWithUser = await this.sessionRepo.findOne({
            where: { id: savedSession.id },
            relations: ['user']
        });

        return sessionWithUser || savedSession;
    }

    async activateSession(sessionId: number) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException('Session not found');

        if (session.status === ChatSessionStatus.ACTIVE) {
            return session; // Already active, no need to throw error
        }

        if (session.status !== ChatSessionStatus.PENDING) {
            throw new BadRequestException(`Cannot activate session with status: ${session.status}`);
        }

        session.status = ChatSessionStatus.ACTIVE;
        session.startTime = new Date();
        return this.sessionRepo.save(session);
    }

    async expireSession(sessionId: number) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session || session.status !== ChatSessionStatus.PENDING) return;

        console.log(`[ChatService] Expiring session ${sessionId} due to timeout`);
        session.status = ChatSessionStatus.EXPIRED;
        await this.sessionRepo.save(session);

        // Release reserved funds
        const referenceId = `chat_${sessionId}`;
        const reservedAmount = session.pricePerMinute * 5;
        try {
            await this.walletService.releaseReserved(session.userId, reservedAmount, referenceId);
        } catch (e) {
            console.error(`Failed to release funds for expired session ${sessionId}:`, e);
        }

        return session;
    }

    async endChat(sessionId: number) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session || session.status === ChatSessionStatus.COMPLETED) {
            return session;
        }

        const now = new Date();
        session.endTime = now;
        session.status = ChatSessionStatus.COMPLETED;

        let totalCost = 0;
        if (session.startTime) {
            const durationInMs = now.getTime() - session.startTime.getTime();
            const durationInMins = Math.ceil(durationInMs / 60000);
            totalCost = durationInMins * session.pricePerMinute;
        }

        session.totalCost = totalCost;
        await this.sessionRepo.save(session);

        const referenceId = `chat_${sessionId}`;
        const initialReservation = session.pricePerMinute * 5;

        try {
            if (totalCost <= initialReservation) {
                if (totalCost > 0) {
                    await this.walletService.deductFromReserved(session.userId, totalCost, referenceId);
                }
                const remainingReserved = initialReservation - totalCost;
                if (remainingReserved > 0) {
                    await this.walletService.releaseReserved(session.userId, remainingReserved, referenceId);
                }
            } else {
                await this.walletService.deductFromReserved(session.userId, initialReservation, referenceId);
                const excessCost = totalCost - initialReservation;
                const { TransactionPurpose } = await import('../wallet/entities/transaction.entity');
                await this.walletService.debit(session.userId, excessCost, TransactionPurpose.CONSULTATION, referenceId);
            }
        } catch (error) {
            console.error(`Failed to settle wallet for session ${sessionId}:`, error);
        }

        // Return updated session with user's remaining balance for the summary popup
        const remainingBalance = await this.walletService.getBalance(session.userId);
        return {
            ...session,
            remainingBalance,
            durationMins: session.startTime ? Math.ceil((session.endTime.getTime() - session.startTime.getTime()) / 60000) : 0
        };
    }

    async getMessages(sessionId: number) {
        return this.messageRepo.find({
            where: { sessionId },
            order: { createdAt: 'ASC' },
        });
    }

    async saveMessage(sessionId: number, senderId: number, senderType: 'user' | 'expert', content: string, type: MessageType = MessageType.TEXT) {
        const message = this.messageRepo.create({
            sessionId,
            senderId,
            senderType,
            content,
            type,
        });

        return this.messageRepo.save(message);
    }
}
