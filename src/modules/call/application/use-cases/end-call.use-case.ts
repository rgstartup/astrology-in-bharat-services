import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/persistence/entities/call-session.entity';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallEndedEvent } from '../../domain/events/call.events';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { TransactionPurpose } from '@/modules/wallet/infrastructure/persistence/entities/transaction.entity';

@Injectable()
export class EndCallUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    @InjectRepository(ProfileExpert)
    private readonly expertRepo: Repository<ProfileExpert>,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    private readonly walletFacade: WalletFacade,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    CallPolicy.ensureSessionExists(session);

    if (
      session.status === CallSessionStatus.COMPLETED ||
      session.status === CallSessionStatus.CANCELLED
    ) {
      return session;
    }

    session.status = CallSessionStatus.COMPLETED;
    session.end_time = new Date();

    if (session.start_time) {
      const durationMs =
        session.end_time.getTime() - session.start_time.getTime();
      session.duration_seconds = Math.floor(durationMs / 1000);
      session.final_price =
        Math.ceil(session.duration_seconds / 60) * session.price_per_minute;
    }

    const savedSession = await this.sessionRepo.save(session);

    this.callGateway.server
      .to(`call_room_${sessionId}`)
      .emit('call_ended', { sessionId });

    // Also notify expert dashboard
    this.callGateway.notifyExpertStatusUpdate(session.expert_id, 'call_ended', { sessionId, session: savedSession });
    this.eventEmitter.emit(
      'call.ended',
      new CallEndedEvent(
        savedSession.id,
        savedSession.user_id,
        savedSession.expert_id,
        savedSession.duration_seconds,
        savedSession.final_price,
      ),
    );

    // 💳 Wallet Settlement
    const referenceId = `call_${sessionId}`;
    const initialReservation = session.price_per_minute * 5;
    const finalPrice = session.final_price || 0;

    try {
      if (finalPrice <= initialReservation) {
        if (finalPrice > 0) {
          await this.walletFacade.deductFromReserved(
            session.user_id,
            finalPrice,
            referenceId,
          );
        }
        const remainingReserved = initialReservation - finalPrice;
        if (remainingReserved > 0) {
          await this.walletFacade.releaseReserved(
            session.user_id,
            remainingReserved,
            referenceId,
          );
        }
      } else {
        await this.walletFacade.deductFromReserved(
          session.user_id,
          initialReservation,
          referenceId,
        );
        const excessCost = finalPrice - initialReservation;
        await this.walletFacade.debit(
          session.user_id,
          excessCost,
          TransactionPurpose.CONSULTATION,
          referenceId,
        );
      }

      // 💳 Credit Expert
      if (finalPrice > 0) {
        const expert = await this.expertRepo.findOne({
          where: { id: session.expert_id },
          relations: ['user'],
        });

        if (expert?.user?.id) {
          await this.walletFacade.credit(
            expert.user.id,
            finalPrice,
            TransactionPurpose.CONSULTATION,
            referenceId,
          );
        }
      }
    } catch (error) {
      console.error(`[EndCall] Failed to settle wallet for session ${sessionId}:`, error);
    }

    return savedSession;
  }
}
