import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
  CallType,
} from '../../infrastructure/entities/call-session.entity';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallEndedEvent } from '../../domain/events/call.events';
import {
  WalletFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/wallet/application/wallet.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { LedgerReferenceType } from '@/modules/finance/commissions/infrastructure/entities/ledger-entry.entity';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class EndCallUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly expertProfileFacade: ExpertProfileFacade,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    private readonly notificationFacade: NotificationFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(sessionId: string, terminatedBy?: string, reason?: string) {
    console.log(
      `[EndCallUseCase] sessionId: ${sessionId}, terminatedBy: ${terminatedBy}, reason: ${reason}`,
    );

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId as unknown as string },
      relations: ['client', 'client.user'],
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
      session.final_price = Number(
        (session.duration_seconds * costPerSecond).toFixed(2),
      );
      session.total_cost = session.final_price;
    }

    const savedSession = await this.sessionRepo.save(session);

    // 💳 Wallet Settlement
    const referenceId = `call_${sessionId}`;
    const finalPrice = session.final_price || 0;

    // Fetch Expert with User (user relation loaded by getExpertById)
    const expert = await this.expertProfileFacade.getExpertById(
      session.expert_id,
    );
    const expertUser = expert?.user as unknown as User | null;

    // Resolve commissions via rules engine (falls back to system_settings)
    const [platformFeeResolved, gstResolved, buyerAgentResolved] =
      await Promise.all([
        this.walletFacade.resolveCommission(
          CommissionEventType.CALL,
          CommissionType.PLATFORM_FEE,
          session.expert_id,
          CommissionAppliesRole.EXPERT,
          finalPrice,
        ),
        this.walletFacade.resolveCommission(
          CommissionEventType.CALL,
          CommissionType.GST,
          null,
          CommissionAppliesRole.ALL,
          finalPrice,
        ),
        this.walletFacade.resolveCommission(
          CommissionEventType.CALL,
          CommissionType.BUYER_AGENT,
          session.client_id,
          CommissionAppliesRole.CLIENT,
          finalPrice,
        ),
      ]);

    const platformFee = platformFeeResolved.amount;
    const gst_rate = gstResolved.amount;
    const gst = Number((platformFee * (gst_rate / 100)).toFixed(2));

    let agent_commission = 0;
    let agent_id: string | undefined = undefined;

    // 1. Seller's Agent Commission (Always paid if referred)
    if (expertUser?.referred_by_id && expert) {
      agent_id = expertUser.referred_by_id;
      const sellerAgentResolved = await this.walletFacade.resolveCommission(
        CommissionEventType.CALL,
        CommissionType.SELLER_AGENT,
        session.expert_id,
        CommissionAppliesRole.EXPERT,
        finalPrice,
      );
      agent_commission = sellerAgentResolved.amount;
    }

    // 2. Buyer's Agent Commission (If buyer has an agent assigned)
    let buyer_agent_commission = 0;
    let buyer_agent_id: string | undefined = undefined;

    const buyerUser = session.client?.user as User | null;
    if (buyerUser?.referred_by_id) {
      buyer_agent_id = buyerUser.referred_by_id;
      buyer_agent_commission = buyerAgentResolved.amount;
    }

    // 3. Expert Net = Total - Platform - GST - Agent (Seller) - Agent (Buyer)
    const expertShare = Number(
      (
        finalPrice -
        platformFee -
        gst -
        agent_commission -
        buyer_agent_commission
      ).toFixed(2),
    );

    // Save to session for persistence
    session.platform_fee = platformFee;
    session.gst = gst;
    session.expert_earning = expertShare;
    session.agent_id = agent_id;
    session.agent_commission = agent_commission;
    await this.sessionRepo.save(session);

    const split = {
      totalAmount: finalPrice,
      totalCost: finalPrice,
      platformFee: Number((finalPrice - expertShare).toFixed(2)),
      expertShare: expertShare,
      agent_commission,
    };

    // Write financial ledger entry
    try {
      await this.walletFacade.createLedgerEntry({
        referenceId,
        referenceType: LedgerReferenceType.CALL,
        grossAmount: finalPrice,
        platformFee,
        gst,
        sellerAgentCommission: agent_commission,
        buyerAgentCommission: buyer_agent_commission,
        providerNet: expertShare,
        clientProfileId: session.client_id,
        providerProfileId: session.expert_id,
        sellerAgentProfileId: agent_id ?? null,
        buyerAgentProfileId: buyer_agent_id ?? null,
        commissionRuleId: platformFeeResolved.ruleId,
      });
    } catch (err) {
      console.error(`[EndCall] Failed to write ledger entry for ${sessionId}:`, err);
    }

    // 🏦 Settlement Logic
    const initialReservation = session.price_per_minute * 5;
    try {
      if (finalPrice <= initialReservation) {
        if (finalPrice > 0) {
          await this.walletFacade.deductFromReserved(
            session.client_id,
            'client_id',
            finalPrice,
            referenceId,
          );
        }
        const remainingReserved = initialReservation - finalPrice;
        if (remainingReserved > 0) {
          await this.walletFacade.releaseReserved(
            session.client_id,
            'client_id',
            remainingReserved,
            referenceId,
          );
        }
      } else {
        await this.walletFacade.deductFromReserved(
          session.client_id,
          'client_id',
          initialReservation,
          referenceId,
        );
        const excessCost = finalPrice - initialReservation;
        await this.walletFacade.debit(
          session.client_id,
          'client_id',
          excessCost,
          TransactionPurpose.CONSULTATION,
          referenceId,
        );
      }

      // 💳 Credit Expert and Agents (Using pre-calculated earnings)
      if (finalPrice > 0) {
        await this.walletFacade.credit(
          session.expert_id,
          'expert_id',
          session.expert_earning,
          TransactionPurpose.CONSULTATION,
          referenceId,
        );

        // 💰 Credit Seller's Agent
        if (agent_commission > 0 && agent_id) {
          const { ProfileAgent } = await import(
            '../../../../agent/infrastructure/entities/profile-agent.entity'
          );
          const agentProfile = await this.sessionRepo.manager.findOne(
            ProfileAgent,
            {
              where: { user_id: agent_id },
              select: ['id'],
            },
          );
          if (agentProfile) {
            await this.walletFacade.credit(
              agentProfile.id,
              'agent_id',
              agent_commission,
              TransactionPurpose.AGENT_COMMISSION,
              referenceId,
            );
          } else {
            console.error(
              `[EndCall] Seller agent profile not found for user_id: ${agent_id}`,
            );
          }
        }

        // 💰 Credit Buyer's Agent
        if (buyer_agent_commission > 0 && buyer_agent_id) {
          const { ProfileAgent } = await import(
            '../../../../agent/infrastructure/entities/profile-agent.entity'
          );
          const agentProfile = await this.sessionRepo.manager.findOne(
            ProfileAgent,
            {
              where: { user_id: buyer_agent_id },
              select: ['id'],
            },
          );
          if (agentProfile) {
            await this.walletFacade.credit(
              agentProfile.id,
              'agent_id',
              buyer_agent_commission,
              TransactionPurpose.AGENT_COMMISSION,
              `call_buyer_ref_${sessionId}`,
            );
          } else {
            console.error(
              `[EndCall] Buyer agent profile not found for user_id: ${buyer_agent_id}`,
            );
          }
        }
      }
    } catch (error) {
      console.error(
        `[EndCall] Failed to settle wallet for session ${sessionId}:`,
        error,
      );
    }

    this.callGateway.server.to(`call_room_${sessionId}`).emit('call_ended', {
      sessionId,
      split,
      terminatedBy,
      terminatedReason: reason,
    });

    // Also notify expert dashboard
    this.callGateway.notifyExpertStatusUpdate(session.expert_id, 'call_ended', {
      sessionId,
      session: session,
      split,
      terminatedBy,
      terminatedReason: reason,
    });

    this.eventEmitter.emit(
      'call.ended',
      new CallEndedEvent(
        session.id,
        session.client_id,
        session.expert_id,
        session.duration_seconds,
        session.final_price,
      ),
    );

    // 🔔 Notify Client
    try {
      if (expert) {
        const startTime = savedSession.start_time
          ? savedSession.start_time.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A';
        const endTime = savedSession.end_time
          ? savedSession.end_time.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A';
        const expertName =
          (expertUser?.name as string | null) || (expert.name as string | null) || 'Astrologer';
        const duration = savedSession.duration_seconds
          ? (savedSession.duration_seconds / 60).toFixed(1)
          : '0';
        const typeLabel =
          savedSession.type === CallType.VIDEO ? 'Video Call' : 'Call';

        const title = 'Consultation Summary';
        const message = `From ${startTime} to ${endTime} you consulted ${expertName} via ${typeLabel}, total duration: ${duration} mins, total cost: ₹${savedSession.final_price}`;

        await this.notificationFacade.create(
          savedSession.client_id,
          RoleEnum.CLIENT,
          NotificationType.GENERAL,
          title,
          message,
          { sessionId, type: 'CALL_SUMMARY' },
        );
      }
    } catch (error) {
      console.error(
        `Failed to send end-call notification for session ${sessionId}:`,
        error,
      );
    }

    return {
      ...savedSession,
      split,
    };
  }
}
