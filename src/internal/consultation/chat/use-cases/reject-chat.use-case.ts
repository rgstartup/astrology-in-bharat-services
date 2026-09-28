import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatSessionStatus } from '../enum';
import { WalletService } from '@/internal/finance/wallet/wallet.service';

@Injectable()
export class RejectChatUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @Inject(forwardRef(() => WalletService)) private walletService: WalletService,
  ) {}

  async execute(sessionId: number) {
    console.log(`[RejectChatUseCase] Rejecting chat sessionId: ${sessionId}`);
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
      await this.walletService.releaseReserved(
        session.client_id,
        'client_id',
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
