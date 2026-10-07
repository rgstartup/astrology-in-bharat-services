import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, isNull, lte, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultations,
  clientAccounts,
  clientWallets,
  expertAccounts,
  expertConsultationPricing,
} from '@/core/drizzledb/schema';
import {
  ExpertClientStatus,
  PricingStatus,
  PricingTargetAudience,
} from '@/core/enums';
import {
  ConsultationMode,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import { PresenceService } from '@/internal/actors/expert/presence/presence.service';
import {
  ChatPriceNotFoundError,
  ClientNotFoundError,
  ExpertNotFoundError,
} from '../errors';
import { ChatEligibilityResponseDto } from '../dto/chat-eligibility-response.dto';

export const MIN_PAID_CHAT_MINUTES = 5;

interface ExpertPricing {
  id: number;
  chatPrice: number;
}

interface ClientFunds {
  id: number;
  balance: number;
  reserved: number;
  completedCount: number;
}

@Injectable()
export class CheckChatEligibilityUsecase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presenceService: PresenceService,
  ) {}

  async execute(
    clientId: number,
    expertId: number,
  ): Promise<ChatEligibilityResponseDto> {
    const [expert, client] = await Promise.all([
      this.fetchExpertWithPricing(expertId),
      this.fetchClientWithWallet(clientId),
    ]);

    const { isEligibleForFree, freeMinutes } = this.decideFreeTrial(
      client.completedCount,
    );
    const minBalanceRequired = expert.chatPrice * MIN_PAID_CHAT_MINUTES;
    const hasBalance = this.decideBalance(
      isEligibleForFree,
      client.balance,
      client.reserved,
      minBalanceRequired,
    );
    const expertIsAvailable = await this.fetchExpertAvailability(expertId);

    return {
      isEligibleForFree,
      freeMinutes,
      hasBalance,
      minBalanceRequired,
      currentBalance: client.balance,
      chatPrice: expert.chatPrice,
      expertIsAvailable,
    };
  }

  /** Query 1: expert + active ALL-audience pricing in one round trip. */
  private async fetchExpertWithPricing(
    expertId: number,
  ): Promise<ExpertPricing> {
    const now = new Date();
    const [row] = await this.db
      .select({
        id: expertAccounts.id,
        fallbackChatPrice: expertAccounts.chat_price,
        activeChatPrice: expertConsultationPricing.chat_price,
      })
      .from(expertAccounts)
      .leftJoin(
        expertConsultationPricing,
        and(
          eq(expertAccounts.id, expertConsultationPricing.expert_id),
          eq(expertConsultationPricing.is_active, true),
          eq(expertConsultationPricing.status, PricingStatus.ACTIVE),
          eq(
            expertConsultationPricing.target_audience,
            PricingTargetAudience.ALL,
          ),
          lte(expertConsultationPricing.effective_from, now),
          or(
            isNull(expertConsultationPricing.effective_to),
            gt(expertConsultationPricing.effective_to, now),
          ),
        ),
      )
      .where(eq(expertAccounts.id, expertId))
      .orderBy(desc(expertConsultationPricing.effective_from))
      .limit(1);
    if (!row) throw new ExpertNotFoundError();

    const raw =
      row.activeChatPrice != null
        ? Number(row.activeChatPrice)
        : row.fallbackChatPrice;
    if (raw == null || Number.isNaN(raw)) throw new ChatPriceNotFoundError();
    return { id: row.id, chatPrice: raw };
  }

  /** Query 2: client + wallet + completed-chat count in one round trip. */
  private async fetchClientWithWallet(clientId: number): Promise<ClientFunds> {
    const [row] = await this.db
      .select({
        id: clientAccounts.id,
        balance: clientWallets.balance,
        reserved_balance: clientWallets.reserved_balance,
        completedCount:
          sql<number>`(select count(*)::int from ${consultations} where ${consultations.client_id} = ${clientAccounts.id} and ${consultations.mode} = ${ConsultationMode.CHAT} and ${consultations.status} = ${ConsultationStatus.COMPLETED})`.mapWith(
            Number,
          ),
      })
      .from(clientAccounts)
      .leftJoin(clientWallets, eq(clientWallets.client_id, clientAccounts.id))
      .where(eq(clientAccounts.id, clientId))
      .limit(1);
    if (!row) throw new ClientNotFoundError();

    return {
      id: row.id,
      balance: row.balance == null ? 0 : Number(row.balance),
      reserved: row.reserved_balance == null ? 0 : Number(row.reserved_balance),
      completedCount: row.completedCount ?? 0,
    };
  }

  private decideFreeTrial(completedCount: number) {
    const isEligibleForFree =
      process.env.FREE_CHAT_ENABLED === 'true' && completedCount === 0;
    const freeMinutes = isEligibleForFree
      ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
      : 0;
    return { isEligibleForFree, freeMinutes };
  }

  private decideBalance(
    isEligibleForFree: boolean,
    balance: number,
    reserved: number,
    minBalanceRequired: number,
  ): boolean {
    if (isEligibleForFree) return true;
    return balance - reserved >= minBalanceRequired;
  }

  private async fetchExpertAvailability(expertId: number): Promise<boolean> {
    const status = await this.presenceService.getStatus(expertId);
    return status === ExpertClientStatus.ONLINE;
  }
}
