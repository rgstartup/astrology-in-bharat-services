import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import {
  ChatSession,
  ChatSessionStatus,
} from '../../infrastructure/entities/chat-session.entity';
import {
  ChatMessage,
  MessageType,
} from '../../infrastructure/entities/chat-message.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class ActivateSessionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
    @Inject(forwardRef(() => WalletFacade)) private walletFacade: WalletFacade,
  ) {}

  async execute(
    sessionId: string,
  ): Promise<{ session: ChatSession; introCard?: ChatMessage }> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['client', 'client.user'],
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

    // Calculate Max Duration based on Wallet Balance + Free Minutes
    const balance = await this.walletFacade.getBalance(session.client_id, 'client_id');
    const paidMinutes =
      session.price_per_minute > 0 ? balance / session.price_per_minute : 60; // fallback 60 mins if price is 0
    const totalMinutes =
      (session.is_free ? session.free_minutes : 0) + paidMinutes;
    session.max_duration_seconds = Math.floor(totalMinutes * 60);

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
      const profileClient = session.client;

      const userData = session.metadata || {
        name:
          session.client?.user?.name ||
          profileClient?.name,
        dob: profileClient?.date_of_birth,
        tob: profileClient?.time_of_birth,
        pob: profileClient?.place_of_birth,
        gender: profileClient?.gender,
      };

      const content = `[INTRO_CARD]${JSON.stringify(userData)}`;

      introCard = await this.messageRepo.save(
        this.messageRepo.create({
          session_id: sessionId,
          sender_id: session.client_id,
          sender_type: 'user',
          content,
          type: MessageType.TEXT,
        }),
      );
    }

    return { session: savedSession, introCard };
  }
}
