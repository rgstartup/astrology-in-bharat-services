import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CallSession, CallSessionStatus, CallType } from '../../infrastructure/entities/call-session.entity';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallEndedEvent } from '../../domain/events/call.events';
import { TransactionPurpose, Transaction, TransactionType } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { Wallet } from '@/modules/finance/wallet/infrastructure/entities/wallet.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { CommissionRule, CommissionType, CommissionEventType, CommissionAppliesRole, CommissionRateType } from '@/modules/finance/commissions/infrastructure/entities/commission-rule.entity';
import { CommissionSplit, SplitReferenceType } from '@/modules/finance/commissions/infrastructure/entities/commission-split.entity';
import { CommissionTier } from '@/modules/finance/commissions/infrastructure/entities/commission-tier.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';
import { GeneralLedgerEntryType, GeneralLedgerEventType, GeneralLedgerPartyType } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { Notification, NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

import { EndCallDto } from '../../api/dto/end-call.dto';

@Injectable()
export class EndCallUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly expertProfileFacade: ExpertProfileFacade,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    private readonly ledgerQueueService: LedgerQueueService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(
    dto: EndCallDto,
  ) {
    const { sessionId, endedBy: terminatedBy, reason } = dto;
    console.log(
      `[EndCallUseCase] sessionId: ${sessionId}, terminatedBy: ${terminatedBy}, reason: ${reason}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const session = await queryRunner.manager.findOne(CallSession, {
        where: { id: sessionId as unknown as string },
        relations: ['client', 'client.user'],
      });

      CallPolicy.ensureSessionExists(session);

      if (
        session.status === CallSessionStatus.COMPLETED ||
        session.status === CallSessionStatus.CANCELLED
      ) {
        const existingSplit = {
          totalAmount: session.total_cost || session.final_price || 0,
          totalCost: session.total_cost || session.final_price || 0,
          platformFee: session.platform_fee || 0,
          expertShare: session.expert_earning || 0,
          agent_commission: session.agent_commission || 0,
        };
        await queryRunner.rollbackTransaction();
        return { ...session, split: existingSplit, terminatedBy: session.terminated_by };
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

      const savedSession = await queryRunner.manager.save(CallSession, session);

      // 💳 Wallet Settlement
      const referenceId = `call_${sessionId}`;
      const finalPrice = session.final_price || 0;

      // Fetch Expert with User (user relation loaded by getExpertById)
      const expert = await this.expertProfileFacade.getExpertById(
        session.expert_id,
      );
      const expertUser = expert?.user as User | null;

      // Resolve commissions via rules engine (falls back to system_settings)
      const [platformFeeResolved, gstResolved, buyerAgentResolved] =
        await Promise.all([
          this.resolveCommission(
            queryRunner.manager,
            CommissionEventType.CALL,
            CommissionType.PLATFORM_FEE,
            session.expert_id,
            CommissionAppliesRole.EXPERT,
            finalPrice,
          ),
          this.resolveCommission(
            queryRunner.manager,
            CommissionEventType.CALL,
            CommissionType.GST,
            null,
            CommissionAppliesRole.ALL,
            finalPrice,
          ),
          this.resolveCommission(
            queryRunner.manager,
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
        const sellerAgentResolved = await this.resolveCommission(
          queryRunner.manager,
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
      await queryRunner.manager.save(CallSession, session);

      const split = {
        totalAmount: finalPrice,
        totalCost: finalPrice,
        platformFee: Number((finalPrice - expertShare).toFixed(2)),
        expertShare: expertShare,
        agent_commission,
      };

      // Write financial ledger entry
      try {
        await this.createCommissionSplit(queryRunner.manager, {
          referenceId,
          referenceType: SplitReferenceType.CALL,
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
        console.error(
          `[EndCall] Failed to write ledger entry for ${sessionId}:`,
          err,
        );
      }

      // 🏦 Settlement Logic
      const initialReservation = session.price_per_minute * 5;
      try {
        if (finalPrice <= initialReservation) {
          if (finalPrice > 0) {
            await this.deductFromReserved(
              queryRunner.manager,
              session.client_id,
              'client_id',
              finalPrice,
              referenceId,
            );
          }
          const remainingReserved = initialReservation - finalPrice;
          if (remainingReserved > 0) {
            await this.releaseReserved(
              queryRunner.manager,
              session.client_id,
              'client_id',
              remainingReserved,
              referenceId,
            );
          }
        } else {
          await this.deductFromReserved(
            queryRunner.manager,
            session.client_id,
            'client_id',
            initialReservation,
            referenceId,
          );
          const excessCost = finalPrice - initialReservation;
          await this.debit(
            queryRunner.manager,
            session.client_id,
            'client_id',
            excessCost,
            TransactionPurpose.CONSULTATION,
            referenceId,
          );
        }

        // 💳 Credit Expert and Agents (Using pre-calculated earnings)
        if (finalPrice > 0) {
          await this.credit(
            queryRunner.manager,
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
            const agentProfile = await queryRunner.manager.findOne(
              ProfileAgent,
              {
                where: { user_id: agent_id },
                select: ['id'],
              },
            );
            if (agentProfile) {
              await this.credit(
                queryRunner.manager,
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
            const agentProfile = await queryRunner.manager.findOne(
              ProfileAgent,
              {
                where: { user_id: buyer_agent_id },
                select: ['id'],
              },
            );
            if (agentProfile) {
              await this.credit(
                queryRunner.manager,
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
            (expertUser?.name as string | null) ||
            (expert.name as string | null) ||
            'Astrologer';
          const duration = savedSession.duration_seconds
            ? (savedSession.duration_seconds / 60).toFixed(1)
            : '0';
          const typeLabel =
            savedSession.type === CallType.VIDEO ? 'Video Call' : 'Call';

          const title = 'Consultation Summary';
          const message = `From ${startTime} to ${endTime} you consulted ${expertName} via ${typeLabel}, total duration: ${duration} mins, total cost: ₹${savedSession.final_price}`;

          const notification = queryRunner.manager.create(Notification, {
            client_id: session.client_id,
            type: NotificationType.GENERAL,
            title,
            message,
            metadata: { sessionId, type: 'CALL_SUMMARY' },
          });
          await queryRunner.manager.save(Notification, notification);
        }
      } catch (error) {
        console.error(
          `Failed to send end-call notification for session ${sessionId}:`,
          error,
        );
      }

      await queryRunner.commitTransaction();

      let remainingBalance = 0;
      try {
        const clientWallet = await this.dataSource.getRepository(Wallet).findOne({
          where: { client_id: savedSession.client_id },
        });
        remainingBalance = clientWallet ? Number(clientWallet.balance) : 0;
      } catch (err) {
        console.error(`Failed to fetch remaining balance for ${sessionId}:`, err);
      }

      return {
        ...savedSession,
        remainingBalance,
        split,
        terminatedBy: savedSession.terminated_by,
      };

    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async getAdminCommissionFromSetting(manager: any, key: string): Promise<number> {
    try {
      let setting = await manager.findOne(SystemSetting, { where: { key } });
      if (!setting) {
        const altKey = key.includes('COMMISSION')
          ? key.replace('COMMISSION', 'COMMISION')
          : key.replace('COMMISION', 'COMMISSION');
        setting = await manager.findOne(SystemSetting, { where: { key: altKey } });
      }
      if (setting && setting.value) {
        return parseFloat(setting.value);
      }
    } catch (e) {
      console.error(`[EndCall] Failed to fetch setting ${key}:`, e);
    }
    return 3;
  }

  private async resolveCommission(
    manager: any,
    eventType: CommissionEventType,
    commissionType: CommissionType,
    profileId: string | null,
    role: CommissionAppliesRole,
    grossAmount: number,
  ): Promise<{ amount: number; ruleId: string | null }> {
    const now = new Date();

    const rules = await manager.find(CommissionRule, {
      where: {
        event_type: eventType,
        commission_type: commissionType,
        is_active: true,
      },
      relations: ['tiers'],
      order: { priority: 'DESC' },
    });

    const activeRules = rules.filter(
      (r: any) =>
        r.effective_from <= now &&
        (r.effective_until === null || r.effective_until >= now),
    );

    const rule: any =
      (profileId
        ? activeRules.find((r: any) => r.applies_to_id === profileId)
        : undefined) ??
      activeRules.find(
        (r: any) => r.applies_to_role === role && r.applies_to_id === null,
      ) ??
      activeRules.find(
        (r: any) =>
          r.applies_to_role === CommissionAppliesRole.ALL &&
          r.applies_to_id === null,
      );

    if (!rule) {
      const legacyAmount = await this.fromLegacySetting(
        manager,
        eventType,
        commissionType,
        grossAmount,
      );
      return { amount: legacyAmount, ruleId: null };
    }

    const matchedTier = (rule.tiers ?? []).find(
      (t: any) =>
        grossAmount >= Number(t.from_amount) &&
        (t.to_amount === null || grossAmount <= Number(t.to_amount)),
    );
    const effectiveRate = matchedTier?.rate ?? rule.rate;
    const effectiveMinCap = matchedTier?.min_cap ?? rule.min_cap;
    const effectiveMaxCap = matchedTier?.max_cap ?? rule.max_cap;

    let raw =
      rule.rate_type === CommissionRateType.FIXED
        ? Number(effectiveRate)
        : grossAmount * (Number(effectiveRate) / 100);

    if (effectiveMinCap !== null && effectiveMinCap !== undefined) {
      raw = Math.max(raw, Number(effectiveMinCap));
    }
    if (effectiveMaxCap !== null && effectiveMaxCap !== undefined) {
      raw = Math.min(raw, Number(effectiveMaxCap));
    }

    return { amount: Number(raw.toFixed(2)), ruleId: rule.id };
  }

  private async fromLegacySetting(
    manager: any,
    eventType: CommissionEventType,
    commissionType: CommissionType,
    grossAmount: number,
  ): Promise<number> {
    const LEGACY_SETTING_MAP: Partial<
      Record<CommissionEventType, Partial<Record<CommissionType, string[]>>>
    > = {
      [CommissionEventType.CHAT]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISSION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
      [CommissionEventType.CALL]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
      [CommissionEventType.PUJA]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_ASTROLOGER',
          'COMMISSION_FROM_ASTROLOGER',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISSION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
      [CommissionEventType.PRODUCT_ORDER]: {
        [CommissionType.PLATFORM_FEE]: [
          'COMMISION_FROM_PUJA_SHOP',
          'COMMISION_FROM_PUJA_SHOP',
        ],
        [CommissionType.SELLER_AGENT]: [
          'COMMISION_FROM_PUJA_SHOP',
          'COMMISION_FROM_PUJA_SHOP',
        ],
        [CommissionType.BUYER_AGENT]: [
          'COMMISION_FOR_BUYER_AGENT',
          'COMMISION_FOR_BUYER_AGENT',
        ],
        [CommissionType.GST]: ['GST_PERCENTAGE'],
      },
    };

    const DEFAULT_RATES: Partial<Record<CommissionType, number>> = {
      [CommissionType.PLATFORM_FEE]: 3,
      [CommissionType.SELLER_AGENT]: 3,
      [CommissionType.BUYER_AGENT]: 3,
      [CommissionType.GST]: 18,
    };

    const keys = LEGACY_SETTING_MAP[eventType]?.[commissionType] ?? [];
    for (const key of keys) {
      const setting = await manager.findOne(SystemSetting, { where: { key } });
      if (setting?.value) {
        const rate = parseFloat(setting.value);
        if (commissionType === CommissionType.GST) {
          return rate;
        }
        return Number((grossAmount * (rate / 100)).toFixed(2));
      }
    }
    const defaultRate = DEFAULT_RATES[commissionType] ?? 3;
    if (commissionType === CommissionType.GST) return defaultRate;
    return Number((grossAmount * (defaultRate / 100)).toFixed(2));
  }

  private async credit(
    manager: any,
    profileId: string,
    walletKey: string,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    let wallet = await manager.findOne(Wallet, {
      where: { [walletKey]: profileId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      const newWallet = new Wallet();
      Object.assign(newWallet, { [walletKey]: profileId });
      newWallet.balance = 0;
      newWallet.reserved_balance = 0;
      wallet = await manager.save(Wallet, newWallet);
    }

    await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => `balance + ${Number(amount)}` })
      .where(`${walletKey} = :profileId`, { profileId })
      .execute();

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + Number(amount);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: TransactionType.CREDIT,
      purpose,
      reference_id: referenceId,
    });
    const savedTx = await manager.save(Transaction, transaction);

    try {
      const roleForTx =
        walletKey === 'expert_id'
          ? 'EXPERT'
          : walletKey === 'merchant_id'
            ? 'MERCHANT'
            : walletKey === 'agent_id'
              ? 'AGENT'
              : 'CLIENT';

      savedTx.transaction_no = generateTransactionNo(
        roleForTx,
        purpose,
        savedTx.id,
      );
      await manager.save(Transaction, savedTx);
    } catch (err) {
      console.error(`[CREDIT_TX] Failed to generate transaction no: ${(err as Error).message}`);
    }

    const purposeToLedgerEventType: Record<TransactionPurpose, GeneralLedgerEventType> = {
      [TransactionPurpose.RECHARGE]: GeneralLedgerEventType.RECHARGE,
      [TransactionPurpose.CONSULTATION]: GeneralLedgerEventType.CONSULTATION,
      [TransactionPurpose.REFUND]: GeneralLedgerEventType.REFUND,
      [TransactionPurpose.WITHDRAWAL]: GeneralLedgerEventType.WITHDRAWAL,
      [TransactionPurpose.PRODUCT_PURCHASE]: GeneralLedgerEventType.PRODUCT_ORDER,
      [TransactionPurpose.PUJA_CONFIRMATION]: GeneralLedgerEventType.PUJA,
      [TransactionPurpose.AGENT_COMMISSION]: GeneralLedgerEventType.AGENT_COMMISSION,
    };

    const walletKeyToPartyType: Record<string, GeneralLedgerPartyType> = {
      client_id: GeneralLedgerPartyType.CLIENT,
      expert_id: GeneralLedgerPartyType.EXPERT,
      merchant_id: GeneralLedgerPartyType.MERCHANT,
      agent_id: GeneralLedgerPartyType.AGENT,
    };

    void this.ledgerQueueService.enqueue({
      event_id: referenceId ?? null,
      event_type: purposeToLedgerEventType[purpose],
      entry_type: GeneralLedgerEntryType.CREDIT,
      party_type: walletKeyToPartyType[walletKey] ?? GeneralLedgerPartyType.CLIENT,
      party_id: profileId,
      amount,
    });

    if (
      walletKey === 'expert_id' &&
      (purpose === TransactionPurpose.CONSULTATION ||
        purpose === TransactionPurpose.PRODUCT_PURCHASE)
    ) {
      try {
        const expertProfile = await manager.findOne(ProfileExpert, {
          where: { id: profileId },
          select: ['id'],
        });

        if (expertProfile) {
          await manager
            .createQueryBuilder()
            .update(ProfileExpert)
            .set({
              total_earning: () => `COALESCE(total_earning, 0) + ${Number(amount)}`,
            })
            .where('id = :id', { id: expertProfile.id })
            .execute();
        }
      } catch (e) {
        console.error(`[CREDIT_TX] Earning tracking failed: ${(e as Error).message}`);
      }
    }

    return wallet;
  }

  private async debit(
    manager: any,
    profileId: string,
    walletKey: string,
    amount: number,
    purpose: TransactionPurpose,
    referenceId?: string,
    allowNegative: boolean = false,
  ): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    let wallet = await manager.findOne(Wallet, {
      where: { [walletKey]: profileId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet) {
      wallet = manager.create(Wallet, {
        [walletKey]: profileId,
        balance: 0,
        reserved_balance: 0,
      });
      wallet = await manager.save(Wallet, wallet);
    }

    const balance = Number(wallet.balance) || 0;
    if (!allowNegative && balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    await manager
      .createQueryBuilder()
      .update(Wallet)
      .set({ balance: () => `balance - ${Number(amount)}` })
      .where(`${walletKey} = :profileId`, { profileId })
      .execute();

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore - Number(amount);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: TransactionType.DEBIT,
      purpose,
      reference_id: referenceId,
    });
    const savedTx = await manager.save(Transaction, transaction);

    try {
      const roleForTx =
        walletKey === 'expert_id'
          ? 'EXPERT'
          : walletKey === 'merchant_id'
            ? 'MERCHANT'
            : walletKey === 'agent_id'
              ? 'AGENT'
              : 'CLIENT';

      savedTx.transaction_no = generateTransactionNo(
        roleForTx,
        purpose,
        savedTx.id,
      );
      await manager.save(Transaction, savedTx);
    } catch (err) {
      console.error(`[DEBIT_TX] Failed to generate transaction no: ${(err as Error).message}`);
    }

    const purposeToLedgerEventType: Record<TransactionPurpose, GeneralLedgerEventType> = {
      [TransactionPurpose.RECHARGE]: GeneralLedgerEventType.RECHARGE,
      [TransactionPurpose.CONSULTATION]: GeneralLedgerEventType.CONSULTATION,
      [TransactionPurpose.REFUND]: GeneralLedgerEventType.REFUND,
      [TransactionPurpose.WITHDRAWAL]: GeneralLedgerEventType.WITHDRAWAL,
      [TransactionPurpose.PRODUCT_PURCHASE]: GeneralLedgerEventType.PRODUCT_ORDER,
      [TransactionPurpose.PUJA_CONFIRMATION]: GeneralLedgerEventType.PUJA,
      [TransactionPurpose.AGENT_COMMISSION]: GeneralLedgerEventType.AGENT_COMMISSION,
    };

    const walletKeyToPartyType: Record<string, GeneralLedgerPartyType> = {
      client_id: GeneralLedgerPartyType.CLIENT,
      expert_id: GeneralLedgerPartyType.EXPERT,
      merchant_id: GeneralLedgerPartyType.MERCHANT,
      agent_id: GeneralLedgerPartyType.AGENT,
    };

    void this.ledgerQueueService.enqueue({
      event_id: referenceId ?? null,
      event_type: purposeToLedgerEventType[purpose],
      entry_type: GeneralLedgerEntryType.DEBIT,
      party_type: walletKeyToPartyType[walletKey] ?? GeneralLedgerPartyType.CLIENT,
      party_id: profileId,
      amount,
    });

    return wallet;
  }

  private async deductFromReserved(
    manager: any,
    profileId: string,
    walletKey: string,
    amount: number,
    referenceId: string,
  ): Promise<void> {
    const wallet = await manager.findOne(Wallet, {
      where: { [walletKey]: profileId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet || Number(wallet.reserved_balance) < amount) {
      throw new BadRequestException('Insufficient reserved balance');
    }

    const balanceBefore = Number(wallet.balance) || 0;

    wallet.reserved_balance = Number(wallet.reserved_balance) - Number(amount);
    await manager.save(Wallet, wallet);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceBefore,
      type: TransactionType.DEBIT,
      purpose: TransactionPurpose.CONSULTATION,
      reference_id: referenceId,
    });
    await manager.save(Transaction, transaction);
  }

  private async releaseReserved(
    manager: any,
    profileId: string,
    walletKey: string,
    amount: number,
    referenceId: string,
  ): Promise<void> {
    const wallet = await manager.findOne(Wallet, {
      where: { [walletKey]: profileId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!wallet || Number(wallet.reserved_balance) < amount) {
      throw new BadRequestException('Insufficient reserved balance to release');
    }

    const balanceBefore = Number(wallet.balance) || 0;
    const balanceAfter = balanceBefore + Number(amount);

    wallet.reserved_balance = Number(wallet.reserved_balance) - Number(amount);
    wallet.balance = balanceAfter;
    await manager.save(Wallet, wallet);

    const transaction = manager.create(Transaction, {
      wallet_id: wallet.id,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      type: TransactionType.RELEASE,
      purpose: TransactionPurpose.REFUND,
      reference_id: referenceId,
    });
    await manager.save(Transaction, transaction);
  }

  private async createCommissionSplit(
    manager: any,
    input: any,
  ): Promise<CommissionSplit> {
    const split = new CommissionSplit();
    split.reference_id = input.referenceId;
    split.reference_type = input.referenceType;
    split.gross_amount = input.grossAmount;
    split.platform_fee = input.platformFee;
    split.gst = input.gst;
    split.seller_agent_commission = input.sellerAgentCommission;
    split.buyer_agent_commission = input.buyerAgentCommission;
    split.provider_net = input.providerNet;
    split.platform_net = Number((input.platformFee + input.gst).toFixed(2));
    split.client_profile_id = input.clientProfileId ?? null;
    split.provider_profile_id = input.providerProfileId ?? null;
    split.seller_agent_profile_id = input.sellerAgentProfileId ?? null;
    split.buyer_agent_profile_id = input.buyerAgentProfileId ?? null;
    split.commission_rule_id = input.commissionRuleId ?? null;

    const saved = await manager.save(CommissionSplit, split);

    const splitRefTypeToLedgerEventType: Record<SplitReferenceType, GeneralLedgerEventType> = {
      [SplitReferenceType.CHAT]: GeneralLedgerEventType.CONSULTATION,
      [SplitReferenceType.CALL]: GeneralLedgerEventType.CONSULTATION,
      [SplitReferenceType.PUJA]: GeneralLedgerEventType.PUJA,
      [SplitReferenceType.ORDER]: GeneralLedgerEventType.PRODUCT_ORDER,
    };

    if (saved.platform_net > 0) {
      void this.ledgerQueueService.enqueue({
        event_id: saved.reference_id,
        event_type: splitRefTypeToLedgerEventType[saved.reference_type],
        entry_type: GeneralLedgerEntryType.CREDIT,
        party_type: GeneralLedgerPartyType.PLATFORM,
        party_id: null,
        amount: saved.platform_net,
        note: `platform_fee=${saved.platform_fee} gst=${saved.gst}`,
      });
    }

    return saved();
  }
}
