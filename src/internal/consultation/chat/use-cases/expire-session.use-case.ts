import type { DeferredDependency } from '../../../../shared/types/deferred-dependency.type';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { WalletService } from '../../../finance/wallet/wallet.service';
import { ChatSessionStatus } from '../enum';

@Injectable()
export class ExpireSessionUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @Inject(forwardRef(() => WalletService))
    private walletService: DeferredDependency<WalletService>,
  ) {}

  async execute(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session || session.status !== ChatSessionStatus.PENDING) return;

    session.status = ChatSessionStatus.EXPIRED;
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
        `Failed to release funds for expired session ${sessionId}:`,
        e,
      );
    }

    return session;
  }
}
