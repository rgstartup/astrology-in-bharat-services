import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class RejectChatUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new Error('Chat session not found');
        }

        if (session.status !== ChatSessionStatus.PENDING) {
            return session; // Already handled or active
        }

        session.status = ChatSessionStatus.REJECTED;
        session.terminated_by = 'EXPERT';
        session.terminated_reason = 'Rejection';
        await this.sessionRepo.save(session);

        // Release reserved funds
        const referenceId = `chat_${sessionId}`;
        const reservedAmount = session.price_per_minute * 5;
        try {
            await this.walletFacade.releaseReserved(
                session.user_id,
                reservedAmount,
                referenceId,
            );
        } catch (e) {
            console.error(
                `Failed to release funds for rejected session ${sessionId}:`,
                e,
            );
        }

        return session;
    }
}
