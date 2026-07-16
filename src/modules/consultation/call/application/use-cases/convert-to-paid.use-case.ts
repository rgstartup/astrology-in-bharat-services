import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from '../../infrastructure/entities/call-session.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class ConvertToPaidUseCase {
  constructor(
    @InjectRepository(CallSession)
    private sessionRepo: Repository<CallSession>,
    @Inject(forwardRef(() => WalletFacade)) private walletFacade: WalletFacade,
  ) {}

  async execute(sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const callPrice = session.price_per_minute || 0;
    const minMins = 1; // Wait, for chat it was 5 mins, let's reserve 5 mins for call continuation too
    const minBalanceRequired = callPrice * 5;

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
      `call_${session.id}`,
    );

    // ✅ Update session to indicate it is now a paid session
    session.is_free = false;
    await this.sessionRepo.save(session);

    return session;
  }
}
