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
  ClientNotFoundError,
  ExpertNotFoundError,
} from '../errors';
import { PriceNotFoundError } from '@/internal/actors/client/consultation/errors';
import { VoiceEligibilityResponseDto } from '../dto/voice-eligibility-response.dto';

/**
 * Minimum billable voice minutes held at request time.
 * Legacy parity: the TypeORM initiate-call path held `minMins = 5`.
 */
export const MIN_PAID_VOICE_MINUTES = 5;

interface ExpertPricing {
  id: number;
  voicePrice: number;
}

interface ClientFunds {
  id: number;
  balance: number;
  reserved: number;
  completedCount: number;
}

@Injectable()
export class CheckVoiceEligibilityUsecase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly presenceService: PresenceService,
  ) {}

  async execute(
    clientId: number,
    expertId: number,
  ): Promise<VoiceEligibilityResponseDto> {
    const [expert, client] = await Promise.all([
      this.fetchExpertWithPricing(expertId),
      this.fetchClientWithWallet(clientId),
    ]);

    const { isEligibleForFree, freeMinutes } = this.decideFreeTrial(
      client.completedCount,
    );
    const minBalanceRequired = expert.voicePrice * MIN_PAID_VOICE_MINUTES;
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
      voicePrice: expert.voicePrice,
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
        fallbackVoicePrice: expertAccounts.call_price,
        activeVoicePrice: expertConsultationPricing.call_price,
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
      row.activeVoicePrice != null
        ? Number(row.activeVoicePrice)
        : row.fallbackVoicePrice;
    if (raw == null || Number.isNaN(raw)) throw new PriceNotFoundError();
    return { id: row.id, voicePrice: raw };
  }

  /** Query 2: client + wallet + completed-voice-call count in one round trip. */
  private async fetchClientWithWallet(clientId: number): Promise<ClientFunds> {
    const [row] = await this.db
      .select({
        id: clientAccounts.id,
        balance: clientWallets.balance,
        reserved_balance: clientWallets.reserved_balance,
        completedCount:
          sql<number>`(select count(*)::int from ${consultations} where ${consultations.client_id} = ${clientAccounts.id} and ${consultations.mode} = ${ConsultationMode.AUDIO_CALL} and ${consultations.status} = ${ConsultationStatus.COMPLETED})`.mapWith(
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
