// @ts-nocheck
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
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

    async execute(userId: string, expertId: string, metadata?: any) {
        // ✅ Check if user already has an ACTIVE or PENDING session
        const existingSession = await this.sessionRepo.findOne({
            where: [
                { client_id: userId as any, status: ChatSessionStatus.ACTIVE },
                { client_id: userId as any, status: ChatSessionStatus.PENDING },
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
            where: { id: expertId as any },
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
            where: { client_id: userId as any, status: ChatSessionStatus.COMPLETED },
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
                    `You don't have enough money to talk 5 minutes to expert. Please add some more money in your wallet.`,
                );
            }
        }

        const session = this.sessionRepo.create({
            client_id: userId,
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

        if (sessionWithUser && sessionWithUser.user) {
            const { ProfileClient } = await import('../../../../client/profile/infrastructure/entities/profile-client.entity');
            const profileClient = await this.sessionRepo.manager.findOne(ProfileClient, {
                where: { user: { id: sessionWithUser.user.id } }
            });
            if (profileClient && profileClient.profile_picture) {
                (sessionWithUser as any).user_image = profileClient.profile_picture;
            }
        }

        return sessionWithUser || savedSession;
    }
}
