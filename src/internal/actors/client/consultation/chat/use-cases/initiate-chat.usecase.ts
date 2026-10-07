import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import {
  consultations,
  consultationSessions,
  clientAccounts,
  clientTransactions,
  clientWallets,
} from '@/core/drizzledb/schema';
import {
  ConsultationMode,
  ConsultationSessionStatus,
  ConsultationStatus,
} from '@/internal/consultation/enums';
import {
  ConsultationRoomRepository,
  chatRequestTtlSeconds,
} from '@/internal/consultation/room/consultation-room.repository';
import { InitiateChatResponseDto } from '../dto/initiate-chat-response.dto';
import { ClientTransactionPurpose } from '@/internal/actors/client/wallet/enum';
import { ClientTransactionType } from '@/internal/actors/client/wallet/enum';
import {
  CheckChatEligibilityUsecase,
  MIN_PAID_CHAT_MINUTES,
} from './check-chat-eligibility.usecase';
import { randomUUIDv7 } from 'node:crypto';

import {
  ActiveConsultationExistsError,
  ChatExpertUnavailableError,
  ChatInsufficientBalanceError,
  ClientNotFoundError,
  ConsultationNotAvailableError,
  ExpertBusyInConsultationError,
} from '../errors';

/** Consultation states that still block a new chat request. */
const OPEN_STATUSES = [
  ConsultationStatus.REQUESTED,
  ConsultationStatus.ACCEPTED,
  ConsultationStatus.ACTIVE,
];

interface PricingQuote {
  chatPrice: number;
  isEligibleForFree: boolean;
  freeMinutes: number;
  minBalanceRequired: number;
}

@Injectable()
export class InitiateChatUsecase {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly checkEligibility: CheckChatEligibilityUsecase,
    private readonly rooms: ConsultationRoomRepository,
  ) {}

  /**
   * Initiate a chat request. Every call creates a NEW session row — no resume.
   * With `consultationId`, the session attaches to that consultation;
   * otherwise a new consultation is created.
   * Both paths return ids only: `{ consultationId, sessionId, maxMinutes }`.
   */
  async execute(
    clientId: number,
    expert_id: number,
    consultationId?: number,
  ): Promise<InitiateChatResponseDto> {
    const [client] = await this.db
      .select({ id: clientAccounts.id })
      .from(clientAccounts)
      .where(eq(clientAccounts.id, clientId))
      .limit(1);

    if (!client) throw new ClientNotFoundError();

    // Pricing + free eligibility read outside the tx; session guards stay inside.
    const eligibility = await this.checkEligibility.execute(
      client.id,
      expert_id,
    );
    if (!eligibility.expertIsAvailable) {
      throw new ChatExpertUnavailableError();
    }
    const quote: PricingQuote = {
      chatPrice: eligibility.chatPrice,
      isEligibleForFree: eligibility.isEligibleForFree,
      freeMinutes: eligibility.freeMinutes,
      minBalanceRequired: eligibility.chatPrice * MIN_PAID_CHAT_MINUTES,
    };

    if (consultationId != null) {
      return this.attachSession(client.id, expert_id, consultationId, quote);
    }
    return this.createConsultation(client.id, expert_id, quote);
  }

  /** Attach a fresh session to an existing open consultation. */
  private async attachSession(
    clientId: number,
    expertId: number,
    consultationId: number,
    quote: PricingQuote,
  ) {
    const { consultationId: id, sessionId } = await this.db.transaction(
      async (tx) => {
        const [consultation] = await tx
          .select()
          .from(consultations)
          .where(eq(consultations.id, consultationId))
          .limit(1);
        if (!consultation || consultation.client_id !== clientId) {
          throw new ConsultationNotAvailableError(
            consultationId,
            'Consultation not found.',
          );
        }
        if (consultation.mode !== ConsultationMode.CHAT) {
          throw new ConsultationNotAvailableError(
            consultationId,
            'Consultation is not a chat consultation.',
          );
        }
        if (consultation.expert_id !== expertId) {
          throw new ConsultationNotAvailableError(
            consultationId,
            'Consultation belongs to another expert.',
          );
        }
        if (!OPEN_STATUSES.includes(consultation.status)) {
          throw new ConsultationNotAvailableError(
            consultationId,
            'Consultation is already closed.',
          );
        }

        const [other] = await tx
          .select()
          .from(consultations)
          .where(
            and(
              eq(consultations.client_id, clientId),
              eq(consultations.mode, ConsultationMode.CHAT),
              inArray(consultations.status, OPEN_STATUSES),
              ne(consultations.id, consultationId),
            ),
          )
          .limit(1);

        if (other) {
          throw new ActiveConsultationExistsError(other);
        }

        const [session] = await tx
          .insert(consultationSessions)
          .values({
            consultation_id: consultation.id,
            mode: ConsultationMode.CHAT,
            status: ConsultationSessionStatus.PENDING,
          })
          .returning({ id: consultationSessions.id });

        return { consultationId: consultation.id, sessionId: session.id };
      },
    );

    await this.rooms.armRoom(id, sessionId);

    // Display math only — no hold on reconnect (already held at creation).
    const maxMinutes = this.maxMinutes(await this.readBalance(clientId), quote);

    return {
      consultationId: id,
      sessionId,
      maxMinutes,
      requestExpiresInSec: chatRequestTtlSeconds(),
    };
  }

  /** Create a new consultation plus its first session. */
  private async createConsultation(
    clientId: number,
    expertId: number,
    quote: PricingQuote,
  ) {
    const { isEligibleForFree, minBalanceRequired } = quote;

    const consultation = await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(consultations)
        .where(
          and(
            eq(consultations.client_id, clientId),
            eq(consultations.mode, ConsultationMode.CHAT),
            inArray(consultations.status, OPEN_STATUSES),
          ),
        )
        .limit(1);

      if (existing) {
        //domain error
        throw new ActiveConsultationExistsError(existing);
      }

      const [expertBusy] = await tx
        .select({ id: consultations.id, status: consultations.status })
        .from(consultations)
        .where(
          and(
            eq(consultations.expert_id, expertId),
            eq(consultations.mode, ConsultationMode.CHAT),
            inArray(consultations.status, OPEN_STATUSES),
          ),
        )
        .limit(1);

      if (expertBusy) {
        //domain error
        throw new ExpertBusyInConsultationError(expertBusy.status);
      }

      // Fresh in-tx read: the check and the HOLD must see the same balance.
      const [wallet] = await tx
        .select()
        .from(clientWallets)
        .where(eq(clientWallets.client_id, clientId))
        .limit(1);
      const balance = wallet ? Number(wallet.balance) : 0;
      const maxMinutes = this.maxMinutes(balance, quote);

      if (!isEligibleForFree) {
        if (!wallet || balance < minBalanceRequired) {
          //domain error
          throw new ChatInsufficientBalanceError();
        }
      }

      const [saved] = await tx
        .insert(consultations)
        .values({
          client_id: clientId,
          expert_id: expertId,
          mode: ConsultationMode.CHAT,
          status: ConsultationStatus.REQUESTED,
        })
        .returning({ id: consultations.id });

      const [session] = await tx
        .insert(consultationSessions)
        .values({
          consultation_id: saved.id,
          mode: ConsultationMode.CHAT,
          status: ConsultationSessionStatus.PENDING,
        })
        .returning({ id: consultationSessions.id });

      if (!isEligibleForFree && wallet) {
        const balanceBefore = Number(wallet.balance);
        const balanceAfter = balanceBefore - minBalanceRequired;
        await tx
          .update(clientWallets)
          .set({
            balance: String(balanceAfter),
            reserved_balance: String(
              Number(wallet.reserved_balance) + minBalanceRequired,
            ),
            updated_at: new Date(),
          })
          .where(eq(clientWallets.id, wallet.id));

        await tx.insert(clientTransactions).values({
          wallet_id: wallet.id,
          amount: String(minBalanceRequired),
          balance_before: String(balanceBefore),
          balance_after: String(balanceAfter),
          type: ClientTransactionType.HOLD,
          purpose: ClientTransactionPurpose.CONSULTATION,
          reference_id: `consultation_${saved.id}`,
          transaction_no: randomUUIDv7(),
        });
      }

      return {
        consultationId: saved.id,
        sessionId: session.id,
        maxMinutes,
        requestExpiresInSec: chatRequestTtlSeconds(),
      };
    });

    await this.rooms.armRoom(
      consultation.consultationId,
      consultation.sessionId,
    );

    return consultation;
  }

  private maxMinutes(balance: number, quote: PricingQuote): number {
    if (quote.isEligibleForFree || quote.chatPrice <= 0) {
      return quote.isEligibleForFree ? quote.freeMinutes : 0;
    }
    return Math.floor(balance / quote.chatPrice);
  }

  /** Display-only balance read. Never use for the HOLD — that re-reads in-tx. */
  private async readBalance(clientId: number): Promise<number> {
    const [wallet] = await this.db
      .select({ balance: clientWallets.balance })
      .from(clientWallets)
      .where(eq(clientWallets.client_id, clientId))
      .limit(1);
    return wallet ? Number(wallet.balance) : 0;
  }
}
