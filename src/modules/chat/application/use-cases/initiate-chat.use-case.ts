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

    async execute(userId: number, expertId: number, metadata?: any) {
        // ✅ Check if user already has an ACTIVE or PENDING session
        const existingSession = await this.sessionRepo.findOne({
            where: [
                { user_id: userId, status: ChatSessionStatus.ACTIVE },
                { user_id: userId, status: ChatSessionStatus.PENDING },
            ],
            relations: ['user'],
        });

        if (existingSession) {
            // Same expert → return existing session so frontend can redirect back to it
            if (existingSession.expert_id === expertId) {
                return { ...existingSession, isResumed: true };
            }

            // Different expert → block completely
            throw new BadRequestException(
                existingSession.status === ChatSessionStatus.ACTIVE
                    ? 'You already have an ongoing chat session with another astrologer. Please end it before starting a new one.'
                    : 'You already have a pending chat request with another astrologer. Please wait for it to expire or cancel it first.',
            );
        }

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
        const minMins = 5; // Restored to 5 to ensure full deduction for sessions up to 5 mins
        const minBalanceRequired = chatPrice * minMins;

        // Check for Free Consultation eligibility (First chat ever)
        const chatCount = await this.sessionRepo.count({
            where: { user_id: userId, status: ChatSessionStatus.COMPLETED },
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
            user_id: userId,
            expert_id: expertId,
            price_per_minute: chatPrice,
            status: ChatSessionStatus.PENDING,
            is_free: isEligibleForFree,
            free_minutes: freeMins,
            metadata,
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
