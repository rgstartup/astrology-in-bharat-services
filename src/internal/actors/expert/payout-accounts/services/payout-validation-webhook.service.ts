import { Inject, Injectable, Logger } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import {
  payoutAccounts,
  payoutAccountReferences,
  payoutWebhookEvents,
} from "@/core/drizzledb/schema";
import { PayoutProviderService } from "../payout-provider.service";

/**
 * System 1 webhook handler for fund-account validation events.
 *
 * Replaces RazorpayXWebhookService (System 2). On `account.activated` it sets
 * `payout_accounts.onboarding_status = VALIDATED`; on `account.rejected` it
 * sets `FAILED`. The account is located via `payout_account_references`
 * (reference_type = 'fund_account', provider_reference = external account id).
 */
@Injectable()
export class PayoutValidationWebhookService {
  private readonly logger = new Logger(PayoutValidationWebhookService.name);

  constructor(
    private readonly providerService: PayoutProviderService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async handleWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ processed: boolean; message: string }> {
    // Resolve the active provider to parse/verify the webhook.
    const provider = this.providerService.resolve("razorpayx");

    // Parse webhook — adapter verifies X-Razorpay-Signature internally.
    const event = await provider.parseWebhook(headers, rawBody);

    // Durable log: insert event before processing (idempotent on provider_event_id).
    let providerEventId: string | null = null;
    let payoutProviderAccountId: number | null = null;
    let inserted = false;

    try {
      const payload = JSON.parse(rawBody.toString("utf8"));
      providerEventId = (payload?.id as string) ?? null;

      if (event?.externalAccountId) {
        const [ref] = await this.db
          .select({
            payout_provider_account_id:
              payoutAccountReferences.payout_provider_account_id,
          })
          .from(payoutAccountReferences)
          .where(
            and(
              eq(payoutAccountReferences.reference_type, "fund_account"),
              eq(
                payoutAccountReferences.provider_reference,
                event.externalAccountId,
              ),
            ),
          )
          .limit(1);
        payoutProviderAccountId = ref?.payout_provider_account_id ?? null;
      }

      if (payoutProviderAccountId && providerEventId) {
        const [row] = await this.db
          .insert(payoutWebhookEvents)
          .values({
            payout_provider_account_id: payoutProviderAccountId,
            provider_event_id: providerEventId,
            event_type: event?.eventType ?? "unknown",
            normalized_event_type: event?.eventType ?? "unknown",
            payload: null,
            signature_verified: event !== null,
            processing_status: event ? "processing" : "failed",
            failure_message: event ? null : "signature_verification_failed",
          })
          .onConflictDoNothing()
          .returning({ id: payoutWebhookEvents.id });
        inserted = !!row;
      }
    } catch {
      // invalid JSON — proceed without durable log
    }

    // Idempotency: skip processing if this event was already handled.
    if (!inserted && payoutProviderAccountId && providerEventId) {
      return { processed: true, message: "ok" };
    }

    if (!event) {
      return { processed: false, message: "ignored" };
    }

    await this.reconcileAccount(event);

    // Mark processed.
    if (payoutProviderAccountId && providerEventId) {
      await this.db
        .update(payoutWebhookEvents)
        .set({
          processing_status: "processed",
          processed_at: new Date(),
        })
        .where(eq(payoutWebhookEvents.provider_event_id, providerEventId));
    }

    return { processed: true, message: "ok" };
  }

  /**
   * Updates `payout_accounts.onboarding_status` based on the fund-account
   * validation event. The account is located through `payout_account_references`.
   */
  private async reconcileAccount(event: {
    externalAccountId: string;
    eventType: string;
  }): Promise<void> {
    const { externalAccountId, eventType } = event;

    if (!externalAccountId) {
      this.logger.warn(
        "Payout validation webhook: missing external account id; skipping reconciliation",
      );
      return;
    }

    let status: "VALIDATED" | "FAILED";

    switch (eventType) {
      case "account.activated":
        status = "VALIDATED";
        break;
      case "account.rejected":
        status = "FAILED";
        break;
      default:
        this.logger.log(
          `Payout validation webhook: unhandled event type ${eventType} for account ${externalAccountId}`,
        );
        return;
    }

    // Find the payout account via its fund_account reference.
    const [ref] = await this.db
      .select({ payout_account_id: payoutAccountReferences.payout_account_id })
      .from(payoutAccountReferences)
      .where(
        and(
          eq(payoutAccountReferences.reference_type, "fund_account"),
          eq(payoutAccountReferences.provider_reference, externalAccountId),
        ),
      )
      .limit(1);

    if (!ref?.payout_account_id) {
      this.logger.warn(
        `Payout validation webhook: no payout account reference found for ${externalAccountId}`,
      );
      return;
    }

    const [updated] = await this.db
      .update(payoutAccounts)
      .set({
        onboarding_status: status,
        updated_at: new Date(),
      })
      .where(eq(payoutAccounts.id, ref.payout_account_id))
      .returning();

    if (updated) {
      this.logger.log(
        `Payout validation webhook: account ${externalAccountId} -> ${status}`,
      );
    } else {
      this.logger.warn(
        `Payout validation webhook: no payout account found for reference ${externalAccountId}`,
      );
    }
  }
}
