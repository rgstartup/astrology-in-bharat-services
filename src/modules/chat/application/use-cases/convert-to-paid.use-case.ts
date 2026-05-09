import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class ConvertToPaidUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
        });
        if (!session) throw new NotFoundException('Session not found');

        const chatPrice = session.price_per_minute || 0;
        const minMins = 5;
        const minBalanceRequired = chatPrice * minMins;

        const hasBalance = await this.walletFacade.validateBalance(
            session.user_id,
            minBalanceRequired,
        );
        if (!hasBalance) {
            throw new BadRequestException(
                `You don't have enough money to talk 5 minutes to expert. Please add some more money in your wallet.`,
            );
        }

        // Reserve balance for the continuation
        await this.walletFacade.reserveBalance(
            session.user_id,
            minBalanceRequired,
            `chat_${session.id}`,
        );

        return session;
    }
}
