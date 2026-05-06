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
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Injectable()
export class EndCallUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    @InjectRepository(ProfileExpert)
    private readonly expertRepo: Repository<ProfileExpert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    private readonly walletFacade: WalletFacade,
    private readonly notificationFacade: NotificationFacade,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(sessionId: number, terminatedBy?: string, reason?: string) {
    console.log(`[EndCallUseCase] sessionId: ${sessionId}, terminatedBy: ${terminatedBy}, reason: ${reason}`);

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
    const finalPrice = session.final_price || 0;

    // Fetch all required commission percentages
    const platformFeeRate = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FROM_ASTROLOGER');
    const gstRate = await this.walletFacade.getAdminCommissionFromSetting('GST_PERCENTAGE');
    const buyerAgentRateSetting = await this.walletFacade.getAdminCommissionFromSetting('COMMISION_FOR_BUYER_AGENT');

    // Fetch Expert with User to check for referral
    const expert = await this.expertRepo.findOne({
        where: { id: session.expert_id },
        relations: ['user'],
    });

    const expertUser = expert?.user;
    let agent_commission = 0;
    let agent_id: number | undefined = undefined;

    // 1. Seller's Agent Commission (Always paid if referred)
    if (expertUser?.referred_by_id && expert) {
        agent_id = expertUser.referred_by_id;
        const effectiveAgentRate = expert.agent_commission_rate ?? platformFeeRate;
        agent_commission = Number((finalPrice * (effectiveAgentRate / 100)).toFixed(2));
    }

    // 2. Buyer's Agent Commission (If buyer has an agent assigned)
    let buyer_agent_commission = 0;
    let buyer_agent_id: number | undefined = undefined;
    
    const buyerUser = await this.userRepo.findOne({
        where: { id: session.user_id },
        select: ['id', 'referred_by_id']
    });

    if (buyerUser?.referred_by_id) {
        buyer_agent_id = buyerUser.referred_by_id;
        buyer_agent_commission = Number((finalPrice * (buyerAgentRateSetting / 100)).toFixed(2));
    }

    // 3. Platform Fee & GST
    const platformFee = Number((finalPrice * (platformFeeRate / 100)).toFixed(2));
    const gst = Number((platformFee * (gstRate / 100)).toFixed(2));
    
    // Expert Net = Total - Platform - GST - Agent (Seller) - Agent (Buyer)
    const expertShare = Number((finalPrice - platformFee - gst - agent_commission - buyer_agent_commission).toFixed(2));
    
    // Save to session for persistence
    session.platform_fee = platformFee;
    session.gst = gst;
    session.expert_earning = expertShare;
    session.agent_id = agent_id;
    session.agent_commission = agent_commission;
    await this.sessionRepo.save(session);

    const split = { 
        totalAmount: finalPrice, 
        totalCost: finalPrice, // Alias for compatibility
        platformFee: Number((finalPrice - expertShare).toFixed(2)), 
        expertShare: expertShare, 
        agent_commission 
    };

    // 🏦 Settlement Logic
    const initialReservation = session.price_per_minute * 5; 
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

      // 💳 Credit Expert and Agents (Using pre-calculated earnings)
      if (finalPrice > 0) {
        if (expertUser?.id) {
          await this.walletFacade.credit(
            expertUser.id,
            session.expert_earning,
            TransactionPurpose.CONSULTATION,
            referenceId,
          );
        }

        // 💰 Credit Seller's Agent
        if (agent_commission > 0 && agent_id) {
          await this.walletFacade.credit(
            agent_id,
            agent_commission,
            TransactionPurpose.AGENT_COMMISSION,
            referenceId,
          );
        }

        // 💰 Credit Buyer's Agent
        if (buyer_agent_commission > 0 && buyer_agent_id) {
          await this.walletFacade.credit(
            buyer_agent_id,
            buyer_agent_commission,
            TransactionPurpose.AGENT_COMMISSION,
            `call_buyer_ref_${sessionId}`,
          );
        }
      }
    } catch (error) {
      console.error(`[EndCall] Failed to settle wallet for session ${sessionId}:`, error);
    }

    this.callGateway.server
      .to(`call_room_${sessionId}`)
      .emit('call_ended', { sessionId, split, terminatedBy, terminatedReason: reason });

    // Also notify expert dashboard
    this.callGateway.notifyExpertStatusUpdate(session.expert_id, 'call_ended', { 
        sessionId, 
        session: session, 
        split, 
        terminatedBy, 
        terminatedReason: reason 
    });
    
    this.eventEmitter.emit(
      'call.ended',
      new CallEndedEvent(
        session.id,
        session.user_id,
        session.expert_id,
        session.duration_seconds,
        session.final_price,
      ),
    );

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
