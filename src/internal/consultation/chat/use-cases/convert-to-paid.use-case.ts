import type { DeferredDependency } from '../../../../shared/types/deferred-dependency.type';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { WalletService } from '../../../finance/wallet/wallet.service';

@Injectable()
export class ConvertToPaidUseCase {
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
    if (!session) throw new NotFoundException('Session not found');

    const chatPrice = session.price_per_minute || 0;
    const minMins = 5;
    const minBalanceRequired = chatPrice * minMins;

    const hasBalance = await this.walletService.validateBalance(
      session.client_id,
      'client_id',
      minBalanceRequired,
    );
    if (!hasBalance) {
      throw new BadRequestException(
        `You don't have enough money to talk 5 minutes to expert. Please add some more money in your wallet.`,
      );
    }

    // Reserve balance for the continuation
    await this.walletService.reserveBalance(
      session.client_id,
      'client_id',
      minBalanceRequired,
      `chat_${session.id}`,
    );

    // ✅ Update session to indicate it is now a paid session
    session.is_free = false;
    await this.sessionRepo.save(session);

    return session;
  }
}
