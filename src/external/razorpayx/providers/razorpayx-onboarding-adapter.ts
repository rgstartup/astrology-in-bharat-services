/**
 * RazorpayX payout onboarding adapter.
 *
 * Implements `PayoutOnboardingService` for RazorpayX:
 *   - Initiate: returns form spec (account_holder_name, account_number, ifsc)
 *   - Complete: creates contact + fund account via RazorpayPayoutService
 *   - Status: reads from local validation_status column
 *   - Penny-drop: validates amount > 0
 *   - Webhook: parses RazorpayX fund_account events
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  PayoutOnboardingService,
  PayoutOnboardingInitiateOutput,
  PayoutOnboardingLinkedAccount,
  PayoutOnboardingAccountStatus,
  PayoutOnboardingWebhookEvent,
  PayoutOnboardingExpertContext,
  PayoutOnboardingCompleteInput,
} from '@/external/payouts/onboarding/payout-onboarding.interface';
import { RazorpayPayoutService } from '@/external/razorpayx/gateways/razorpay-payout.service';

@Injectable()
export class RazorpayXOnboardingAdapter implements PayoutOnboardingService {
  readonly provider = 'razorpayx';
  private readonly logger = new Logger(RazorpayXOnboardingAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly payoutService: RazorpayPayoutService,
  ) {}

  async initiate(
    _ctx: PayoutOnboardingExpertContext,
  ): Promise<PayoutOnboardingInitiateOutput> {
    return {
      type: 'form',
      fields: ['account_holder_name', 'account_number', 'ifsc'],
      url: '',
    };
  }

  async complete(
    input: PayoutOnboardingCompleteInput,
  ): Promise<PayoutOnboardingLinkedAccount> {
    if (!input.accountHolderName || !input.accountNumber || !input.ifsc) {
      throw new BadRequestException(
        'accountHolderName, accountNumber and ifsc are required',
      );
    }

    const contactId = await this.payoutService.getOrCreateContact({
      id: 'expert',
      name: input.accountHolderName,
    });

    const fundAccountId = await this.payoutService.getOrCreateFundAccount(
      contactId,
      {
        name: input.accountHolderName,
        account: input.accountNumber,
        ifsc: input.ifsc,
      },
    );

    return {
      externalAccountId: fundAccountId,
      accessToken: '',
      raw: { fundAccountId, contactId },
    };
  }

  async fetchAccountStatus(_ctx: {
    externalAccountId: string;
    accessToken: string;
  }): Promise<PayoutOnboardingAccountStatus> {
    return {
      active: false,
      status: 'unknown',
      failureReason:
        'RazorpayX fund account status must be read from local validation_status column',
    };
  }

  async deactivate(_externalAccountId: string): Promise<void> {
    this.logger.log(
      `RazorpayX fund account deactivate requested for ${_externalAccountId} — no-op (API not available)`,
    );
  }

  async validatePennyDrop(
    validationId: string,
    amount: number,
  ): Promise<{ validated: boolean }> {
    const validated = amount > 0;
    this.logger.log(
      `Penny-drop validation for ${validationId}: amount=${amount} validated=${validated}`,
    );
    return { validated };
  }

  async parseWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer,
  ): Promise<PayoutOnboardingWebhookEvent | null> {
    const signature =
      (headers['x-razorpay-signature'] as string | undefined) ??
      (headers['X-Razorpay-Signature'] as string | undefined);

    if (!signature) {
      this.logger.warn('RazorpayX webhook: missing signature header');
      return null;
    }

    const webhookSecret = this.configService.get<string>('razorpay.webhookSecret');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      this.logger.warn('RazorpayX webhook: signature mismatch');
      return null;
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return null;
    }

    const event = payload?.event as string | undefined;
    const fundAccount = payload?.payload?.fund_account?.entity as any;
    const externalAccountId = fundAccount?.id || fundAccount?.fund_account_id;

    if (!externalAccountId || !event) {
      return null;
    }

    let eventType: string;
    switch (event) {
      case 'fund_account.validated':
        eventType = 'account.activated';
        break;
      case 'fund_account.failed':
      case 'fund_account.rejected':
        eventType = 'account.rejected';
        break;
      case 'payout.paid':
      case 'payout.processed':
        eventType = 'payout.completed';
        break;
      case 'payout.failed':
        eventType = 'payout.failed';
        break;
      default:
        return null;
    }

    return {
      externalAccountId,
      eventType,
      raw: payload,
    };
  }
}