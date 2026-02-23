import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class ExpireSessionUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
        });
        if (!session || session.status !== ChatSessionStatus.PENDING) return;

        console.log(`[ChatService] Expiring session ${sessionId} due to timeout`);
        session.status = ChatSessionStatus.EXPIRED;
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
                `Failed to release funds for expired session ${sessionId}:`,
                e,
            );
        }

        return session;
    }
}
