import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  PujaAppointment,
  PujaAppointmentStatus,
} from '../../infrastructure/entities/puja-appointment.entity';
import { UpdatePujaAppointmentStatusDto } from '../dtos/update-puja-appointment-status.dto';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { Wallet } from '@/modules/finance/wallet/infrastructure/entities/wallet.entity';
import { Transaction, TransactionType, TransactionPurpose } from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { CommissionSplit, SplitReferenceType } from '@/modules/finance/commissions/infrastructure/entities/commission-split.entity';
import { generateTransactionNo } from '@/common/utils/transaction-no.util';
import { LedgerQueueService } from '@/core/queue/services/ledger-queue.service';
import { GeneralLedgerEntryType, GeneralLedgerEventType, GeneralLedgerPartyType } from '@/modules/finance/general-ledger/infrastructure/entities/general-ledger-entry.entity';
import { Todo } from '@/modules/expert/todos/infrastructure/entities/todo.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { ProfileAgent } from '@/modules/agent/infrastructure/entities/profile-agent.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

// Resolved commission interface
interface ResolvedCommission {
  amount: number;
  rate: number;
  ruleId: string | null;
}

@Injectable()
export class UpdatePujaAppointmentStatusUseCase {
  constructor(
    @InjectRepository(PujaAppointment)
    private pujaAppointmentRepository: Repository<PujaAppointment>,
    private notificationFacade: NotificationFacade,
    private readonly ledgerQueueService: LedgerQueueService,
    private dataSource: DataSource,
  ) {}

  private async resolveCommissionLocal(
    manager: EntityManager,
    eventType: string,
    commissionType: string,
    profileId: string | null,
    role: string,
    grossAmount: number,
  ): Promise<ResolvedCommission> {
    const LEGACY_SETTING_MAP: Record<string, Record<string, string[]>> = {
      puja: {
        platform_fee: ['commission.puja.platform', 'commission.puja.rate'],
        gst: ['commission.puja.gst', 'tax.gst.rate'],
        seller_agent: ['commission.puja.agent.seller', 'commission.agent.seller.rate'],
        buyer_agent: ['commission.puja.agent.buyer', 'commission.agent.buyer.rate'],
      },
    };

    const DEFAULT_RATES: Record<string, number> = {
      platform_fee: 10,
      gst: 18,
      seller_agent: 5,
      buyer_agent: 5,
    };

    const keys = LEGACY_SETTING_MAP[eventType]?.[commissionType] ?? [];
    for (const key of keys) {
      const setting = await manager.findOne(SystemSetting, { where: { key } });
      if (setting?.value) {
        const rate = parseFloat(setting.value);
        if (commissionType === 'gst') {
          return { amount: rate, rate, ruleId: null };
        }
        const amt = Number((grossAmount * (rate / 100)).toFixed(2));
        return { amount: amt, rate, ruleId: null };
      }
    }
    const defaultRate = DEFAULT_RATES[commissionType] ?? 5;
    if (commissionType === 'gst') return { amount: defaultRate, rate: defaultRate, ruleId: null };
    const amt = Number((grossAmount * (defaultRate / 100)).toFixed(2));
    return { amount: amt, rate: defaultRate, ruleId: null };
  }

  private async debit(
    manager: EntityManager,
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

  private async credit(
    manager: EntityManager,
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
      wallet = manager.create(Wallet, {
        [walletKey]: profileId,
        balance: 0,
        reserved_balance: 0,
      });
      wallet = await manager.save(Wallet, wallet);
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
        purpose === TransactionPurpose.PUJA_CONFIRMATION ||
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

  private async createCommissionSplit(
    manager: EntityManager,
    input: any,
  ): Promise<CommissionSplit> {
    const split = manager.create(CommissionSplit, {
      reference_id: input.referenceId,
      reference_type: input.referenceType,
      gross_amount: input.grossAmount,
      platform_fee: input.platformFee,
      gst: input.gst,
      seller_agent_commission: input.sellerAgentCommission,
      buyer_agent_commission: input.buyerAgentCommission,
      provider_net: input.providerNet,
      platform_net: Number((input.platformFee + input.gst).toFixed(2)),
      client_profile_id: input.clientProfileId ?? null,
      provider_profile_id: input.providerProfileId ?? null,
      seller_agent_profile_id: input.sellerAgentProfileId ?? null,
      buyer_agent_profile_id: input.buyerAgentProfileId ?? null,
      commission_rule_id: input.commissionRuleId ?? null,
    });
    return manager.save(CommissionSplit, split);
  }

  async execute(
    id: string,
    operatingProfileId: string,
    dto: UpdatePujaAppointmentStatusDto,
  ): Promise<BooleanMessage> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const appointment = await qr.manager.findOne(PujaAppointment, {
        where: { id },
        relations: ['expert', 'puja', 'client', 'client.user'],
      });

      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }

      // Determine who is performing the update
      const isExpert = appointment.expert_id === operatingProfileId;
      const isClient = appointment.client_id === operatingProfileId;

      if (!isExpert && !isClient) {
        throw new NotFoundException('Appointment not found for this profile');
      }

      // Rules for client update
      if (isClient && !isExpert) {
        if (dto.status === PujaAppointmentStatus.ACCEPTED) {
          if (appointment.status !== PujaAppointmentStatus.ON_HOLD) {
            throw new BadRequestException(
              'You can only accept an appointment that has been rescheduled (ON_HOLD) by the expert.',
            );
          }
        } else if (
          dto.status !== PujaAppointmentStatus.CONFIRMED &&
          dto.status !== PujaAppointmentStatus.CANCELLED
        ) {
          throw new BadRequestException(
            'As a client, you can only confirm (pay), accept reschedule, or cancel the appointment.',
          );
        }

        if (dto.status === PujaAppointmentStatus.CONFIRMED) {
          if (
            appointment.status !== PujaAppointmentStatus.ACCEPTED &&
            appointment.status !== PujaAppointmentStatus.ON_HOLD
          ) {
            throw new BadRequestException(
              'Appointment must be accepted or rescheduled by the expert before you can confirm and pay.',
            );
          }

          // --- PAYMENT LOGIC WITH ATOMIC TRANSACTION ---
          const totalAmount = appointment.price;

          // Fetch Expert's full user profile for referral check
          const expertUser = await qr.manager.findOne(User, {
            where: { id: appointment.expert.user_id as unknown as string },
          });

          // Resolve commissions via rules engine locally
          const [platformFeeResolved, gstResolved, buyerAgentResolved] =
            await Promise.all([
              this.resolveCommissionLocal(
                qr.manager,
                'puja',
                'platform_fee',
                appointment.expert.id,
                'expert',
                totalAmount,
              ),
              this.resolveCommissionLocal(
                qr.manager,
                'puja',
                'gst',
                null,
                'all',
                totalAmount,
              ),
              this.resolveCommissionLocal(
                qr.manager,
                'puja',
                'buyer_agent',
                appointment.client?.id ?? null,
                'client',
                totalAmount,
              ),
            ]);

          const platformFee = platformFeeResolved.amount;
          const gst_rate = gstResolved.amount;
          const gst = Number((platformFee * (gst_rate / 100)).toFixed(2));

          let agent_commission = 0;
          let agent_id: string | undefined = undefined;

          // Check if Seller Agent Commission is applicable (Referred)
          if (expertUser?.referred_by_id) {
            agent_id = expertUser.referred_by_id;
            const sellerAgentResolved = await this.resolveCommissionLocal(
              qr.manager,
              'puja',
              'seller_agent',
              appointment.expert.id,
              'expert',
              totalAmount,
            );
            agent_commission = sellerAgentResolved.amount;
          }

          let buyer_agent_commission = 0;
          let buyer_agent_id: string | undefined = undefined;

          const buyerUser = await qr.manager.findOne(User, {
            where: {
              id: (appointment.client?.user_id as unknown as string) || '',
            },
            select: ['id', 'referred_by_id'],
          });

          if (buyerUser?.referred_by_id) {
            buyer_agent_id = buyerUser.referred_by_id;
            buyer_agent_commission = buyerAgentResolved.amount;
          }

          // Expert Net = Total - Platform - GST - Agent (Seller) - Agent (Buyer)
          const expertNetShare = Number(
            (
              totalAmount -
              platformFee -
              gst -
              agent_commission -
              buyer_agent_commission
            ).toFixed(2),
          );

          // 1. Debit User
          if (!appointment.client?.id) {
            throw new Error('Client profile ID is missing');
          }
          await this.debit(
            qr.manager,
            appointment.client.id,
            'client_id',
            totalAmount,
            TransactionPurpose.PUJA_CONFIRMATION,
            `puja_appt_${appointment.id}`,
          );

          // 2. Credit Expert (Net Share)
          if (!appointment.expert?.id) {
            throw new Error('Expert profile ID is missing');
          }
          await this.credit(
            qr.manager,
            appointment.expert.id,
            'expert_id',
            expertNetShare,
            TransactionPurpose.PUJA_CONFIRMATION,
            `puja_appt_${appointment.id}`,
          );

          // 3. Credit Seller's Agent (if applicable)
          if (agent_commission > 0 && agent_id) {
            const agentProfile = await qr.manager.findOne(ProfileAgent, {
              where: { user_id: agent_id },
            });
            if (agentProfile) {
              await this.credit(
                qr.manager,
                agentProfile.id,
                'agent_id',
                agent_commission,
                TransactionPurpose.AGENT_COMMISSION,
                `puja_appt_${appointment.id}`,
              );
            }
          }

          // 4. Credit Buyer's Agent (if applicable)
          if (buyer_agent_commission > 0 && buyer_agent_id) {
            const buyerAgentProfile = await qr.manager.findOne(ProfileAgent, {
              where: { user_id: buyer_agent_id },
            });
            if (buyerAgentProfile) {
              await this.credit(
                qr.manager,
                buyerAgentProfile.id,
                'agent_id',
                buyer_agent_commission,
                TransactionPurpose.AGENT_COMMISSION,
                `puja_appt_buyer_ref_${appointment.id}`,
              );
            }
          }

          // Write financial ledger entry
          try {
            await this.createCommissionSplit(
              qr.manager,
              {
                referenceId: `puja_appt_${appointment.id}`,
                referenceType: SplitReferenceType.PUJA,
                grossAmount: totalAmount,
                platformFee,
                gst,
                sellerAgentCommission: agent_commission,
                buyerAgentCommission: buyer_agent_commission,
                providerNet: expertNetShare,
                clientProfileId: appointment.client?.id ?? null,
                providerProfileId: appointment.expert?.id ?? null,
                sellerAgentProfileId: agent_id ?? null,
                buyerAgentProfileId: buyer_agent_id ?? null,
                commissionRuleId: platformFeeResolved.ruleId,
              },
            );
          } catch (err) {
            console.error('Failed to write puja ledger entry:', err);
          }

          // 3. Create Todo for Expert
          try {
            const todo = qr.manager.create(Todo, {
              user_id: appointment.expert.user_id as unknown as string,
              text: `Confirmed Puja: ${appointment.puja?.name} with ${appointment.client?.user?.name || 'Client'} on ${String(appointment.scheduled_date || 'TBD')} at ${String(appointment.scheduled_time || 'TBD')}`,
            });
            await qr.manager.save(Todo, todo);
          } catch (err) {
            console.error('Failed to create todo for expert:', err);
          }

          // 4. Notify Expert
          try {
            await this.notificationFacade.create(
              appointment.expert.id,
              RoleEnum.EXPERT,
              NotificationType.GENERAL,
              'Puja Confirmed! (Paid)',
              `User ${appointment.client?.user?.name || 'Client'} has paid for the ${appointment.puja?.name || 'Puja'} Ritual scheduled for ${String(appointment.scheduled_date || 'TBD')}.`,
              { appointment_id: appointment.id, type: 'PUJA_CONFIRMED' },
            );
          } catch (err) {
            console.error('Failed to notify expert of confirmation:', err);
          }
        }
      }

      // --- SECURITY CHECK: ROLE-BASED FIELD UPDATES ---
      if (dto.status) {
        if (isClient && !isExpert) {
          // Client restricted statuses
          const allowedClientStatuses = [
            PujaAppointmentStatus.CONFIRMED,
            PujaAppointmentStatus.CANCELLED,
            PujaAppointmentStatus.ACCEPTED,
          ];
          if (!allowedClientStatuses.includes(dto.status)) {
            throw new BadRequestException(
              `As a client, you cannot set status to ${dto.status}`,
            );
          }
        }
        appointment.status = dto.status;
      }

      if (dto.expert_message) {
        if (!isExpert) {
          throw new BadRequestException(
            'Only the expert can provide or update the expert message.',
          );
        }
        appointment.expert_message = dto.expert_message;
      }

      if (dto.price !== undefined) {
        if (!isExpert) {
          throw new BadRequestException(
            'Only the expert can adjust the price of the ritual.',
          );
        }
        appointment.price = dto.price;
      }

      if (dto.scheduled_date) {
        if (!isExpert && appointment.status !== PujaAppointmentStatus.PENDING) {
          throw new BadRequestException(
            'Schedule can only be modified by the expert once the request is processed.',
          );
        }
        appointment.scheduled_date = dto.scheduled_date;
      }

      if (dto.scheduled_time) {
        if (!isExpert && appointment.status !== PujaAppointmentStatus.PENDING) {
          throw new BadRequestException(
            'Schedule can only be modified by the expert once the request is processed.',
          );
        }
        appointment.scheduled_time = dto.scheduled_time;
      }

      const saved = await qr.manager.save(PujaAppointment, appointment);

      // Notify User (if update was by expert)
      if (isExpert) {
        let title = 'Puja Request Update';
        let message = `Your request for ${appointment.puja?.name || 'Puja'} has been ${dto.status}.`;

        if (dto.status === PujaAppointmentStatus.ON_HOLD)
          message = `Your request for ${appointment.puja?.name || 'Puja'} is on hold.`;
        if (dto.status === PujaAppointmentStatus.ACCEPTED)
          title = 'Puja Request Accepted!';

        try {
          await this.notificationFacade.create(
            appointment.client?.id || '',
            RoleEnum.CLIENT,
            NotificationType.GENERAL,
            title,
            message,
            { appointment_id: saved.id, type: 'PUJA_STATUS_UPDATE' },
          );
        } catch (error) {
          console.error(
            'Failed to send status update notification to user:',
            error,
          );
        }
      }

      // Notify Expert (if update was by client)
      if (
        isClient &&
        !isExpert &&
        dto.status === PujaAppointmentStatus.ACCEPTED
      ) {
        try {
          await this.notificationFacade.create(
            appointment.expert.id,
            RoleEnum.EXPERT,
            NotificationType.GENERAL,
            'Reschedule Accepted!',
            `User ${appointment.client?.user?.name || 'Client'} has accepted your proposed time for ${appointment.puja?.name || 'Puja'}.`,
            { appointment_id: saved.id, type: 'PUJA_RESCHEDULE_ACCEPTED' },
          );
        } catch (error) {
          console.error(
            'Failed to send status update notification to expert:',
            error,
          );
        }
      }

      await qr.commitTransaction();
      return new BooleanMessage();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
