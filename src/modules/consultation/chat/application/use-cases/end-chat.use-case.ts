import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ChatSession, ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';
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
import { Notification, NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class EndChatUseCase {
  constructor(
    @InjectRepository(ChatSession)
    private sessionRepo: Repository<ChatSession>,
    private readonly ledgerQueueService: LedgerQueueService,
    private readonly dataSource: DataSource,
  ) {}

  async execute(sessionId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const session = await queryRunner.manager.findOne(ChatSession, {
        where: { id: sessionId },
        relations: ['client', 'client.user', 'expert', 'expert.user'],
      });
      if (!session || session.status === ChatSessionStatus.COMPLETED) {
        await queryRunner.rollbackTransaction();
        return session;
      }

      const now = new Date();
      session.end_time = now;
      session.status = ChatSessionStatus.COMPLETED;

      let total_cost = 0;
      if (session.start_time) {
        const durationInMs = now.getTime() - session.start_time.getTime();
        const actualDurationMins = durationInMs / 60000;

        // Subtract free minutes if applicable
        const billableMins = Math.max(
          0,
          actualDurationMins - (session.free_minutes || 0),
        );
        // Limit to two decimal places for accurate sub-minute billing
        total_cost = Number((billableMins * session.price_per_minute).toFixed(2));
      }

      const expert = session.expert;
      const expertUser = expert?.user;

      // Resolve commissions via rules engine (falls back to system_settings)
      const [platformFeeResolved, gstResolved, buyerAgentResolved] =
        await Promise.all([
          this.resolveCommission(
            queryRunner.manager,
            CommissionEventType.CHAT,
            CommissionType.PLATFORM_FEE,
            session.expert_id,
            CommissionAppliesRole.EXPERT,
            total_cost,
          ),
          this.resolveCommission(
            queryRunner.manager,
            CommissionEventType.CHAT,
            CommissionType.GST,
            null,
            CommissionAppliesRole.ALL,
            total_cost,
          ),
          this.resolveCommission(
            queryRunner.manager,
            CommissionEventType.CHAT,
            CommissionType.BUYER_AGENT,
            session.client_id,
            CommissionAppliesRole.CLIENT,
            total_cost,
          ),
        ]);

      const platform_fee = platformFeeResolved.amount;
      const gst_rate = gstResolved.amount; // GST resolve returns the % rate for chat
      const gst = Number((platform_fee * (gst_rate / 100)).toFixed(2));

      let agent_commission = 0;
      let agent_id: string | undefined = undefined;

      // Seller's agent commission (Referred expert)
      if (expertUser?.referred_by_id && expert) {
        agent_id = expertUser.referred_by_id;
        const sellerAgentResolved = await this.resolveCommission(
          queryRunner.manager,
          CommissionEventType.CHAT,
          CommissionType.SELLER_AGENT,
          session.expert_id,
          CommissionAppliesRole.EXPERT,
          total_cost,
        );
        agent_commission = sellerAgentResolved.amount;
      }

      let buyer_agent_commission = 0;
      let buyer_agent_id: string | undefined = undefined;

      const buyerUser = session.client?.user;

      if (buyerUser?.referred_by_id) {
        buyer_agent_id = buyerUser.referred_by_id;
        buyer_agent_commission = buyerAgentResolved.amount;
      }

      // Expert Net = Total - Platform - GST - Agent (Seller) - Agent (Buyer)
      const expert_earning = Number(
        (
          total_cost -
          platform_fee -
          gst -
          agent_commission -
          buyer_agent_commission
        ).toFixed(2),
      );

      session.total_cost = total_cost;
      session.platform_fee = platform_fee;
      session.gst = gst;
      session.expert_earning = expert_earning;
      session.agent_id = agent_id;
      session.agent_commission = agent_commission;

      const split = {
        totalAmount: total_cost,
        totalCost: total_cost, // Alias for compatibility
        platformFee: Number((total_cost - expert_earning).toFixed(2)), // Deductions = Total - Net
        expertShare: expert_earning,
        agent_commission,
        buyer_agent_commission,
      };

      await queryRunner.manager.save(ChatSession, session);

      const referenceId = `chat_${sessionId}`;

      // Write financial ledger entry
      try {
        await this.createCommissionSplit(queryRunner.manager, {
          referenceId,
          referenceType: SplitReferenceType.CHAT,
          grossAmount: total_cost,
          platformFee: platform_fee,
          gst,
          sellerAgentCommission: agent_commission,
          buyerAgentCommission: buyer_agent_commission,
          providerNet: expert_earning,
          clientProfileId: session.client_id,
          providerProfileId: session.expert_id,
          sellerAgentProfileId: agent_id ?? null,
          buyerAgentProfileId: buyer_agent_id ?? null,
          commissionRuleId: platformFeeResolved.ruleId,
        });
      } catch (err) {
        console.error(
          `[EndChat] Failed to write ledger entry for ${sessionId}:`,
          err,
        );
      }

      // 🏦 Settlement Logic
      try {
        const initialReservation = session.price_per_minute * 5;

        if (total_cost <= initialReservation) {
          if (total_cost > 0) {
            await this.deductFromReserved(
              queryRunner.manager,
              session.client_id,
              'client_id',
              total_cost,
              referenceId,
            );
          }
          const remainingReserved = initialReservation - total_cost;
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
          const excessCost = total_cost - initialReservation;
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
        if (total_cost > 0) {
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
                `[EndChat] Seller agent profile not found for user_id: ${agent_id}`,
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
                `chat_buyer_ref_${sessionId}`,
              );
            } else {
              console.error(
                `[EndChat] Buyer agent profile not found for user_id: ${buyer_agent_id}`,
              );
            }
          }
        }
      } catch (error) {
        console.error(`Failed to settle wallet for session ${sessionId}:`, error);
      }

      await queryRunner.commitTransaction();

      // Return updated session with user's remaining balance for the summary popup
      let remainingBalance = 0;
      try {
        const clientWallet = await this.dataSource.getRepository(Wallet).findOne({
          where: { client_id: session.client_id },
        });
        remainingBalance = clientWallet ? Number(clientWallet.balance) : 0;
      } catch (err) {
        console.error(`Failed to get client wallet balance:`, err);
      }

      // 🔔 Notify User
      try {
        if (session.client?.user) {
          const startTime = session.start_time
            ? session.start_time.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A';
          const endTime = session.end_time
            ? session.end_time.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A';
          const expertName = session.expert?.user?.name || 'Astrologer';
          const duration = session.start_time
            ? (
                (session.end_time.getTime() - session.start_time.getTime()) /
                60000
            ).toFixed(1)
            : '0';

          const title = 'Consultation Summary';
          const message = `From ${startTime} to ${endTime} you consulted ${expertName} via Chat, total duration: ${duration} mins, total cost: ₹${session.total_cost}`;

          const notification = this.dataSource.getRepository(Notification).create({
            client_id: session.client_id,
            type: NotificationType.GENERAL,
            title,
            message,
            metadata: { sessionId, type: 'CHAT_SUMMARY' },
          });
          await this.dataSource.getRepository(Notification).save(notification);
        }
      } catch (error) {
        console.error(
          `Failed to send end-chat notification for session ${sessionId}:`,
          error,
        );
      }

      return {
        ...session,
        remainingBalance,
        durationMins: session.start_time
          ? Number(
              (
                (session.end_time.getTime() - session.start_time.getTime()) /
                60000
              ).toFixed(2),
            )
          : 0,
        split,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
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
      console.error(`[EndChat] Failed to fetch setting ${key}:`, e);
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

    return saved;
  }
}
