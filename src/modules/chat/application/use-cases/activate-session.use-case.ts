import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { ChatMessage, MessageType } from '../../infrastructure/persistence/entities/chat-message.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class ActivateSessionUseCase {
    constructor(
        @InjectRepository(ChatSession)
        private sessionRepo: Repository<ChatSession>,
        @InjectRepository(ChatMessage)
        private messageRepo: Repository<ChatMessage>,
        private walletFacade: WalletFacade,
    ) { }

    async execute(sessionId: number): Promise<{ session: ChatSession, introCard?: ChatMessage }> {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
            relations: ['user', 'user.profile_client'],
        });
        if (!session) throw new NotFoundException('Session not found');

        if (session.status === ChatSessionStatus.ACTIVE) {
            return { session }; // Already active, no need to throw error
        }

        if (session.status !== ChatSessionStatus.PENDING) {
            throw new BadRequestException(
                `Cannot activate session with status: ${session.status}`,
            );
        }

        session.status = ChatSessionStatus.ACTIVE;
        session.start_time = new Date();

        // Calculate Max Duration based on Wallet Balance
        const balance = await this.walletFacade.getBalance(session.user_id);
        const maxMinutes = balance / session.price_per_minute;
        session.max_duration_seconds = Math.floor(maxMinutes * 60);

        const savedSession = await this.sessionRepo.save(session);

        // ✅ Automatically send Intro Card
        let introCard: ChatMessage | undefined;

        // Check if an intro card was already sent (safety check)
        const existingCard = await this.messageRepo.findOne({
            where: {
                session_id: sessionId,
                content: Like('[INTRO_CARD]%'),
            },
        });

        if (!existingCard) {
            const userData = session.metadata || {
                name: session.user?.name,
                dob: session.user?.profile_client?.date_of_birth,
                tob: session.user?.profile_client?.time_of_birth,
                pob: session.user?.profile_client?.place_of_birth,
                gender: session.user?.profile_client?.gender,
            };

            const content = `[INTRO_CARD]${JSON.stringify(userData)}`;

            introCard = await this.messageRepo.save(
                this.messageRepo.create({
                    session_id: sessionId,
                    sender_id: session.user_id,
                    sender_type: 'user',
                    content,
                    type: MessageType.TEXT,
                }),
            );
        }

        return { session: savedSession, introCard };
    }
}
