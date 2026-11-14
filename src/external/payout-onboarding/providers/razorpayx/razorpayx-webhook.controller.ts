import {
  Controller,
  Post,
  Req,
  Res,
  BadRequestException,
  Inject,
  Logger,
} from "@nestjs/common";
import { Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { Public } from "@/shared/decorators/public.decorator";
import {
  payoutPlatformAccounts,
  payoutWebhookEvents,
  payoutAccountReferences,
} from "@/core/drizzledb/schema";
import { RazorpayXPayoutAdapter } from "./razorpayx-payout-adapter";

@Controller({
  path: "webhooks/razorpayx",
  version: "1",
})
export class RazorpayXWebhookController {
  private readonly logger = new Logger(RazorpayXWebhookController.name);

  constructor(
    private readonly adapter: RazorpayXPayoutAdapter,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  @Post()
  @Public()
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Res() res: Response,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException("Missing raw body");
    }

    const headers = req.headers as Record<
      string,
      string | string[] | undefined
    >;

    // Parse webhook — adapter verifies X-Razorpay-Signature internally.
    const event = await this.adapter.parseWebhook(headers, rawBody);

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
            failure_message: event
              ? null
              : "signature_verification_failed",
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
      return res.status(200).send("ok");
    }

    if (!event) {
      return res.status(200).send("ignored");
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

    return res.status(200).send("ok");
  }

  /**
   * RazorpayX fund account status is not exposed via a public GET endpoint,
   * so the local `validation_status` column is the source of truth.
   * Webhook events flip that status so the onboarding flow stays in sync.
   */
  private async reconcileAccount(event: {
    externalAccountId: string;
    eventType: string;
  }): Promise<void> {
    const { externalAccountId, eventType } = event;

    if (!externalAccountId) {
      this.logger.warn(
        "RazorpayX webhook: missing external account id; skipping reconciliation",
      );
      return;
    }

    let status: "VALIDATED" | "FAILED";
    let failureReason: string | undefined;

    switch (eventType) {
      case "account.activated":
        status = "VALIDATED";
        break;
      case "account.rejected":
        status = "FAILED";
        failureReason = "provider rejected fund account";
        break;
      default:
        this.logger.log(
          `RazorpayX webhook: unhandled event type ${eventType} for account ${externalAccountId}`,
        );
        return;
    }

    const [updated] = await this.db
      .update(payoutPlatformAccounts)
      .set({
        validationStatus: status,
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(payoutPlatformAccounts.platformFundId, externalAccountId))
      .returning();

    if (updated) {
      this.logger.log(
        `RazorpayX webhook: account ${externalAccountId} -> ${status}`,
      );
    } else {
      this.logger.warn(
        `RazorpayX webhook: no payout platform account found for ${externalAccountId}`,
      );
    }
  }
}
