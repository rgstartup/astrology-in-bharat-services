import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../../infrastructure/entities/chat-session.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class ConvertToPaidUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    @Inject(forwardRef(() => WalletFacade)) private walletFacade: WalletFacade,
  ) {}

  async execute(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const chatPrice = session.price_per_minute || 0;
    const minMins = 5;
    const minBalanceRequired = chatPrice * minMins;

    const hasBalance = await this.walletFacade.validateBalance(
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
    await this.walletFacade.reserveBalance(
      session.client_id,
      'client_id',
      minBalanceRequired,
      `chat_${session.id}`,
    );

    return session;
  }
}
