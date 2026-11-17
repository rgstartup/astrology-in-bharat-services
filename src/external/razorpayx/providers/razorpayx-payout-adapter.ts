/**
 * RazorpayX payout provider adapter.
 *
 * Implements `PayoutProvider` for RazorpayX:
 *   - Onboarding: Contact + Fund Account creation, penny-drop validation
 *   - Payout execution: POST /payouts, GET /payouts/{id}
 *   - Webhook: X-Razorpay-Signature verification + event parsing
 *
 * Reuses `RazorpayPayoutService` for the low-level RazorpayX API calls.
 * Maps RazorpayX-specific errors to normalized `PayoutProviderError`s.
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  PayoutProvider,
  CreatePayoutInput,
  CreatePayoutOutput,
  PayoutStatusOutput,
  PAYOUT_PROVIDER,
} from '@/external/payouts/onboarding/payout-provider.interface';
import {
  PayoutOnboardingInitiateOutput,
  PayoutOnboardingLinkedAccount,
  PayoutOnboardingAccountStatus,
  PayoutOnboardingWebhookEvent,
  PayoutOnboardingExpertContext,
} from '@/external/payouts/onboarding/payout-onboarding.interface';
import { RazorpayPayoutService } from '@/external/razorpayx/gateways/razorpay-payout.service';
import { RAZORPAYX_CAPABILITIES } from '@/external/payouts/onboarding/provider-capability';
import { mapRazorpayError, PayoutProviderError } from '@/external/payouts/onboarding/payout-provider.errors';

@Injectable()
export class RazorpayXPayoutAdapter implements PayoutProvider {
  readonly provider = 'razorpayx';
  readonly capabilities = RAZORPAYX_CAPABILITIES;
  private readonly logger = new Logger(RazorpayXPayoutAdapter.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly payoutService: RazorpayPayoutService,
  ) {}

  // ── Onboarding ──────────────────────────────────────────────────────

  async initiate(
    _ctx: PayoutOnboardingExpertContext,
  ): Promise<PayoutOnboardingInitiateOutput> {
    return {
      type: 'form',
      fields: ['account_holder_name', 'account_number', 'ifsc'],
      url: '',
    };
  }

  async complete(input: {
    code?: string;
    state?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifsc?: string;
  }): Promise<PayoutOnboardingLinkedAccount> {
    if (!input.accountHolderName || !input.accountNumber || !input.ifsc) {
      throw new BadRequestException(
        'accountHolderName, accountNumber and ifsc are required',
      );
    }

    const contactId = await this.payoutService.getOrCreateContact({
      id: 'expert',
      name: input.accountHolderName,
    });

    const fundAccountResult = await this.payoutService.getOrCreateFundAccount(
      contactId,
      {
        name: input.accountHolderName,
        account: input.accountNumber,
        ifsc: input.ifsc,
      },
    );

    return {
      externalAccountId: fundAccountResult.fundAccountId,
      accessToken: '',
      raw: { fundAccountId: fundAccountResult.fundAccountId, contactId },
      accountNumberMasked: fundAccountResult.accountNumberMasked ?? undefined,
      bankName: fundAccountResult.bankName ?? undefined,
      ifsc: fundAccountResult.ifsc ?? undefined,
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

  // ── Payout execution ────────────────────────────────────────────────

  async createPayout(input: CreatePayoutInput): Promise<CreatePayoutOutput> {
    try {
      const response = await this.payoutService.initiatePayout(
        Number(input.payoutId),
        input.amount,
        input.destinationId,
      );

      const providerReference =
        (response.id as string) ??
        (response.reference_id as string) ??
        String(input.payoutId);

      const status = this.normalizePayoutStatus(
        (response.status as string | undefined) ?? 'created',
      );

      return {
        providerPayoutReference: providerReference,
        status,
        raw: response,
      };
    } catch (err: unknown) {
      throw this.mapError(err);
    }
  }

  async getPayoutStatus(
    providerPayoutReference: string,
  ): Promise<PayoutStatusOutput> {
    try {
      const response = await this.payoutService.getPayoutStatus(
        providerPayoutReference,
      );

      const status = this.normalizePayoutStatus(
        (response.status as string | undefined) ?? 'created',
      );

      return {
        providerPayoutReference,
        status,
        raw: response,
      };
    } catch (err: unknown) {
      throw this.mapError(err);
    }
  }

  private normalizePayoutStatus(providerStatus: string): CreatePayoutOutput['status'] {
    const s = (providerStatus ?? '').toLowerCase();
    switch (s) {
      case 'pending':
      case 'created':
        return 'created';
      case 'queued':
        return 'queued';
      case 'processing':
      case 'processing':
        return 'processing';
      case 'paid':
      case 'processed':
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      case 'reversed':
        return 'reversed';
      default:
        return 'created';
    }
  }

  mapError(err: unknown): PayoutProviderError {
    return mapRazorpayError(err, this.provider);
  }
}

export { RAZORPAYX_CAPABILITIES };
export { PayoutProviderError };
export { mapRazorpayError };
