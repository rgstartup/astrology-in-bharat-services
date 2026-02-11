import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '@/modules/chat/domain/entities/chat-message.entity';
import { ChatSession } from '@/modules/chat/domain/entities/chat-session.entity';
import { ProfileExpert } from '@/modules/expert/domain/entities/profile-expert.entity';
import { WalletService } from '@/modules/wallet/application/services/wallet.service';
import { TransactionPurpose } from '@/modules/wallet/domain/entities/transaction.entity';
import { MessageType } from '../../domain/entities/chat-message.entity';
import { ChatSessionStatus, SessionType } from '../../domain/entities/chat-session.entity';
import { IChatMessageRepository } from '../../domain/repositories/chat-message.repository.interface';
import { IChatSessionRepository } from '../../domain/repositories/chat-session.repository.interface';

@Injectable()
export class ChatService {
  constructor(
    @Inject(IChatSessionRepository)
    private sessionRepo: IChatSessionRepository,
    @Inject(IChatMessageRepository)
    private messageRepo: IChatMessageRepository,
    @InjectRepository(ProfileExpert)
    private expertRepo: Repository<ProfileExpert>,
    private walletService: WalletService,
  ) { }

  async getSession(id: number) {
    return this.sessionRepo.findOne({
      where: { id },
      relations: ['user', 'expert', 'expert.user'],
    });
  }

  async getPendingSessionsForExpert(expertId: number) {
    const { MoreThan } = await import('typeorm');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return this.sessionRepo.find({
      where: [
        { expertId, status: ChatSessionStatus.PENDING },
        { expertId, status: ChatSessionStatus.ACTIVE },
        {
          expertId,
          status: ChatSessionStatus.COMPLETED,
          createdAt: MoreThan(oneHourAgo),
        },
        {
          expertId,
          status: ChatSessionStatus.EXPIRED,
          createdAt: MoreThan(oneHourAgo),
        },
      ],
      relations: ['user', 'expert', 'expert.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentPendingSessionsByExpertUser(userId: number) {
    const expert = await this.expertRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!expert) return [];

    const { MoreThan } = await import('typeorm');
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    return this.sessionRepo.find({
      where: [
        {
          expertId: expert.id,
          status: ChatSessionStatus.PENDING,
          createdAt: MoreThan(twelveHoursAgo),
        },
        {
          expertId: expert.id,
          status: ChatSessionStatus.ACTIVE,
          createdAt: MoreThan(twelveHoursAgo),
        },
        {
          expertId: expert.id,
          status: ChatSessionStatus.COMPLETED,
          createdAt: MoreThan(twelveHoursAgo),
        },
        {
          expertId: expert.id,
          status: ChatSessionStatus.EXPIRED,
          createdAt: MoreThan(twelveHoursAgo),
        },
      ],
      relations: ['user', 'expert', 'expert.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingSessionsByExpertUser(userId: number) {
    const expert = await this.expertRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!expert) {
      return [];
    }
    return this.getPendingSessionsForExpert(expert.id);
  }

  async getCompletedSessionsByExpertUser(userId: number) {
    const expert = await this.expertRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!expert) {
      return [];
    }

    return this.sessionRepo.find({
      where: [
        { expertId: expert.id, status: ChatSessionStatus.COMPLETED },
        { expertId: expert.id, status: ChatSessionStatus.EXPIRED },
        { expertId: expert.id, status: ChatSessionStatus.CANCELLED },
      ],
      relations: ['user', 'expert', 'expert.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentCompletedSessionsByExpertUser(userId: number) {
    const expert = await this.expertRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!expert) return [];

    const { MoreThan } = await import('typeorm');
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    return this.sessionRepo.find({
      where: [
        {
          expertId: expert.id,
          status: ChatSessionStatus.COMPLETED,
          createdAt: MoreThan(twelveHoursAgo),
        },
        {
          expertId: expert.id,
          status: ChatSessionStatus.EXPIRED,
          createdAt: MoreThan(twelveHoursAgo),
        },
        {
          expertId: expert.id,
          status: ChatSessionStatus.CANCELLED,
          createdAt: MoreThan(twelveHoursAgo),
        },
      ],
      relations: ['user', 'expert', 'expert.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveClientSession(userId: number) {
    return this.sessionRepo.findOne({
      where: [
        { userId, status: ChatSessionStatus.PENDING },
        { userId, status: ChatSessionStatus.ACTIVE },
      ],
      relations: ['expert', 'expert.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSessionsByExpertUser(userId: number) {
    const expert = await this.expertRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!expert) {
      return [];
    }

    return this.sessionRepo.find({
      where: { expertId: expert.id },
      relations: ['user', 'expert', 'expert.user', 'review'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAllSessionsByClient(userId: number) {
    return this.sessionRepo.find({
      where: { userId },
      relations: ['expert', 'expert.user', 'review'],
      order: { createdAt: 'DESC' },
    });
  }

  async initiateChat(userId: number, expertId: number, type: SessionType = SessionType.CHAT) {
    const expert = await this.expertRepo.findOne({
      where: { id: expertId },
    });

    if (!expert) {
      throw new NotFoundException('Expert not found');
    }

    if (!expert.is_available) {
      throw new BadRequestException(
        'Expert is currently offline and not accepting requests at the moment.',
      );
    }

    let chatPrice = expert.chat_price || 0;
    if (type === SessionType.VOICE) chatPrice = expert.call_price || expert.chat_price || 0;
    if (type === SessionType.VIDEO) chatPrice = expert.video_call_price || expert.chat_price || 0;

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
      const hasBalance = await this.walletService.validateBalance(
        userId,
        minBalanceRequired,
      );
      if (!hasBalance) {
        throw new BadRequestException(
          `Insufficient balance. Minimum ${minMins} minutes (₹${minBalanceRequired}) balance is required to start ${type}.`,
        );
      }
    }

    const session = this.sessionRepo.create({
      userId,
      expertId,
      pricePerMinute: chatPrice,
      status: ChatSessionStatus.PENDING,
      sessionType: type,
      isFree: isEligibleForFree,
      freeMinutes: freeMins,
    });

    const savedSession = await this.sessionRepo.save(session);

    // Hold balance only if not free
    if (!isEligibleForFree) {
      await this.walletService.reserveBalance(
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

  async activateSession(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.status === ChatSessionStatus.ACTIVE) {
      return session; // Already active, no need to throw error
    }

    if (session.status !== ChatSessionStatus.PENDING) {
      throw new BadRequestException(
        `Cannot activate session with status: ${session.status}`,
      );
    }

    session.status = ChatSessionStatus.ACTIVE;
    session.startTime = new Date();
    return this.sessionRepo.save(session);
  }

  async expireSession(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.status !== ChatSessionStatus.PENDING) return;

    console.log(`[ChatService] Expiring session ${sessionId} due to timeout`);
    session.status = ChatSessionStatus.EXPIRED;
    await this.sessionRepo.save(session);

    // Release reserved funds
    const referenceId = `chat_${sessionId}`;
    const reservedAmount = session.pricePerMinute * 5;
    try {
      await this.walletService.releaseReserved(
        session.userId,
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

  async endChat(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.status === ChatSessionStatus.COMPLETED) {
      return session;
    }

    const now = new Date();
    session.endTime = now;
    session.status = ChatSessionStatus.COMPLETED;

    let totalCost = 0;
    if (session.startTime) {
      const durationInMs = now.getTime() - session.startTime.getTime();
      const actualDurationMins = Math.ceil(durationInMs / 60000);

      // Subtract free minutes if applicable
      const billableMins = Math.max(
        0,
        actualDurationMins - (session.freeMinutes || 0),
      );
      totalCost = billableMins * session.pricePerMinute;
      session.duration = actualDurationMins;
    }

    session.totalCost = totalCost;
    await this.sessionRepo.save(session);

    const referenceId = `chat_${sessionId}`;
    const initialReservation = session.pricePerMinute * 5;

    try {
      if (totalCost <= initialReservation) {
        if (totalCost > 0) {
          await this.walletService.deductFromReserved(
            session.userId,
            totalCost,
            referenceId,
          );
        }
        const remainingReserved = initialReservation - totalCost;
        if (remainingReserved > 0) {
          await this.walletService.releaseReserved(
            session.userId,
            remainingReserved,
            referenceId,
          );
        }
      } else {
        await this.walletService.deductFromReserved(
          session.userId,
          initialReservation,
          referenceId,
        );
        const excessCost = totalCost - initialReservation;
        await this.walletService.debit(
          session.userId,
          excessCost,
          TransactionPurpose.CONSULTATION,
          referenceId,
        );
      }

      // 💳 Credit Expert
      if (totalCost > 0) {
        const sessionWithExpert = await this.sessionRepo.findOne({
          where: { id: sessionId },
          relations: ['expert', 'expert.user'],
        });

        if (sessionWithExpert?.expert?.user?.id) {
          await this.walletService.credit(
            sessionWithExpert.expert.user.id,
            totalCost,
            TransactionPurpose.CONSULTATION,
            referenceId,
          );
          console.log(`[ChatService] Credited expert ${sessionWithExpert.expert.user.id} with ₹${totalCost} for session ${sessionId}`);
        } else {
          console.error(`[ChatService] Could not credit expert for session ${sessionId}: Expert or User ID missing`, {
            expert: sessionWithExpert?.expert,
            userId: sessionWithExpert?.expert?.user?.id
          });
        }
      }
    } catch (error) {
      console.error(`Failed to settle wallet for session ${sessionId}:`, error);
    }

    // Return updated session with user's remaining balance for the summary popup
    const remainingBalance = await this.walletService.getBalance(
      session.userId,
    );
    return {
      ...session,
      remainingBalance,
      durationMins: session.startTime
        ? Math.ceil(
          (session.endTime.getTime() - session.startTime.getTime()) / 60000,
        )
        : 0,
    };
  }

  async convertToPaid(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const chatPrice = session.pricePerMinute || 0;
    const minMins = 5;
    const minBalanceRequired = chatPrice * minMins;

    const hasBalance = await this.walletService.validateBalance(
      session.userId,
      minBalanceRequired,
    );
    if (!hasBalance) {
      throw new BadRequestException(
        `Insufficient balance to continue. Minimum 5 minutes (₹${minBalanceRequired}) balance is required.`,
      );
    }

    // Reserve balance for the continuation
    await this.walletService.reserveBalance(
      session.userId,
      minBalanceRequired,
      `chat_${session.id}`,
    );

    session.isFree = false;
    session.freeMinutes = 0;
    return this.sessionRepo.save(session);
  }

  async getMessages(sessionId: number) {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async saveMessage(
    sessionId: number,
    senderId: number,
    senderType: 'user' | 'expert' | 'admin',
    content: string,
    type: MessageType = MessageType.TEXT,
    attachmentUrl?: string,
    attachmentType?: string,
  ) {
    const message = this.messageRepo.create({
      sessionId,
      senderId,
      senderType,
      content,
      type,
      attachmentUrl,
      attachmentType,
    });

    return this.messageRepo.save(message);
  }

  async getAllLiveSessions(type?: string) {
    return this.sessionRepo.findAllWithFilters(type);
  }

  async getTotalSessionsCount() {
    return this.sessionRepo.count();
  }

  async saveSession(session: ChatSession): Promise<ChatSession> {
    return this.sessionRepo.save(session);
  }
}
