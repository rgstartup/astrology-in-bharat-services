import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/entities/call-session.entity';
import { CallGateway } from '../../call.gateway';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

@Injectable()
export class RejectCallUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  async execute(sessionId: string) {
    console.log(`[RejectCallUseCase] Rejecting sessionId: ${sessionId}`);
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Call session not found');
    }

    if (session.status !== CallSessionStatus.PENDING) {
      return session;
    }

    session.status = CallSessionStatus.REJECTED;
    session.terminated_by = 'EXPERT';
    session.terminated_reason = 'Rejection';
    await this.sessionRepo.save(session);

    // Notify expert dashboard and user
    this.callGateway.notifyExpertStatusUpdate(session.expert_id, 'call_ended', {
      sessionId,
      status: 'rejected',
    });

    // Release reserved wallet funds
    const referenceId = `call_${sessionId}`;
    const reservedAmount = session.price_per_minute * 5;
    try {
      await this.walletFacade.releaseReserved(
        session.client_id,
        'client_id',
        reservedAmount,
        referenceId,
      );
    } catch (e) {
      console.error(
        `Failed to release funds for rejected call session ${sessionId}:`,
        e,
      );
    }

    return session;
  }
}
