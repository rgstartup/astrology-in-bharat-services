import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class InitiateChatUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(userId: number, expertId: number) {
        const expert = await this.expertRepo.findOne({
            where: { id: expertId },
        });

        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        if (!expert.is_available) {
            throw new BadRequestException(
                'Expert is currently offline and not accepting chat requests at the moment.',
            );
        }

        const chatPrice = expert.chat_price || 0;
        const minMins = 5;
        const minBalanceRequired = chatPrice * minMins;

        // Check for Free Consultation eligibility (First chat ever)
        const chatCount = await this.sessionRepo.count({
            where: { userId, status: ChatSessionStatus.COMPLETED },
        });

        const isFreeEnabled = process.env.FREE_CHAT_ENABLED === 'true';
        const isEligibleForFree = isFreeEnabled && chatCount === 0;
        const freeMins = isEligibleForFree
            ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
            : 0;

        if (!isEligibleForFree) {
            const hasBalance = await this.walletFacade.validateBalance(
                userId,
                minBalanceRequired,
            );
            if (!hasBalance) {
                throw new BadRequestException(
                    `Insufficient balance. Minimum ${minMins} minutes (₹${minBalanceRequired}) balance is required to start chat.`,
                );
            }
        }

        const session = this.sessionRepo.create({
            userId,
            expertId,
            pricePerMinute: chatPrice,
            status: ChatSessionStatus.PENDING,
            isFree: isEligibleForFree,
            freeMinutes: freeMins,
        });

        const savedSession = await this.sessionRepo.save(session);

        // Hold balance only if not free
        if (!isEligibleForFree) {
            await this.walletFacade.reserveBalance(
                userId,
                minBalanceRequired,
                `chat_${savedSession.id}`,
            );
        }

        // Fetch again with relations to ensure 'user' (client) info is included for the expert dashboard
        const sessionWithUser = await this.sessionRepo.findOne({
            where: { id: savedSession.id },
            relations: ['user'],
        });

        return sessionWithUser || savedSession;
    }
}
