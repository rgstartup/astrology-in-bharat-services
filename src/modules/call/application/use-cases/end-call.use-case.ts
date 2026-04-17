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
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/persistence/entities/notification.entity';
import { CallType } from '../../infrastructure/persistence/entities/call-session.entity';

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
    private readonly notificationFacade: NotificationFacade,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(sessionId: number, terminatedBy?: string, reason?: string) {
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
    session.terminated_by = terminatedBy ?? null;
    session.terminated_reason = reason ?? null;

    if (session.start_time) {
      const durationMs =
        session.end_time.getTime() - session.start_time.getTime();
      session.duration_seconds = Math.floor(durationMs / 1000);
      
      // Pro-rata billing (per second)
      const costPerSecond = session.price_per_minute / 60;
      session.final_price = Number((session.duration_seconds * costPerSecond).toFixed(2));
      session.total_cost = session.final_price;
    }

    const savedSession = await this.sessionRepo.save(session);

    // 💳 Wallet Settlement
    const referenceId = `call_${sessionId}`;
    const initialReservation = session.price_per_minute * 5;
    const finalPrice = session.final_price || 0;
    const platformFee = Number((finalPrice * 0.2).toFixed(2));
    const expertShare = Number((finalPrice - platformFee).toFixed(2));
    const split = { totalAmount: finalPrice, platformFee, expertShare };

    this.callGateway.server
      .to(`call_room_${sessionId}`)
      .emit('call_ended', { sessionId, split, terminatedBy, terminatedReason: reason });

    // Also notify expert dashboard
    this.callGateway.notifyExpertStatusUpdate(session.expert_id, 'call_ended', { 
        sessionId, 
        session: savedSession, 
        split, 
        terminatedBy, 
        terminatedReason: reason 
    });
    
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
            expertShare,
            TransactionPurpose.CONSULTATION,
            referenceId,
          );
        }
      }
    } catch (error) {
      console.error(`[EndCall] Failed to settle wallet for session ${sessionId}:`, error);
    }

    // 🔔 Notify User
    try {
      const expert = await this.expertRepo.findOne({
        where: { id: savedSession.expert_id },
        relations: ['user'],
      });

      if (expert) {
        const startTime = savedSession.start_time ? savedSession.start_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const endTime = savedSession.end_time ? savedSession.end_time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
        const expertName = expert.user?.name || 'Astrologer';
        const duration = savedSession.duration_seconds ? (savedSession.duration_seconds / 60).toFixed(1) : '0';
        const typeLabel = savedSession.type === CallType.VIDEO ? 'Video Call' : 'Call';
        
        const title = "Consultation Summary";
        const message = `From ${startTime} to ${endTime} you consulted ${expertName} via ${typeLabel}, total duration: ${duration} mins, total cost: ₹${savedSession.final_price}`;
        
        await this.notificationFacade.create(
          savedSession.user_id,
          NotificationType.GENERAL,
          title,
          message,
          { sessionId, type: 'CALL_SUMMARY' }
        );
      }
    } catch (error) {
      console.error(`Failed to send end-call notification for session ${sessionId}:`, error);
    }

    return {
      ...savedSession,
      split,
    };
  }
}
