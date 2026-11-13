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
import { eq } from "drizzle-orm";
import { DRIZZLE } from "@/core/drizzledb/drizzle.constants";
import type { DrizzleDb } from "@/core/drizzledb/drizzle.types";
import { Public } from "@/shared/decorators/public.decorator";
import {
  payoutPlatformAccounts,
} from "@/core/drizzledb/schema";
import { RazorpayXOnboardingService } from "./razorpayx-onboarding.service";

@Controller({
  path: "webhooks/razorpayx",
  version: "1",
})
export class RazorpayXWebhookController {
  private readonly logger = new Logger(RazorpayXWebhookController.name);

  constructor(
    private readonly service: RazorpayXOnboardingService,
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

    const event = await this.service.parseWebhook(headers, rawBody);

    if (!event) {
      return res.status(200).send("ignored");
    }

    await this.reconcileAccount(event);

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
