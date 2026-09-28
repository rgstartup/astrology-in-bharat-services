import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  HttpCode,
  Req,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WalletService } from '../wallet.service';
import { WithdrawalStatus } from '../enum';
import { createHmac } from 'crypto';
import { RazorpayConfig } from '@/config/razorpay.config';

@Controller('wallet/webhooks/payouts')
export class PayoutWebhookController {
  private readonly logger = new Logger(PayoutWebhookController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  async handleWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-razorpay-signature') signature: string,
    @Req() req: import('express').Request & { rawBody?: Buffer | string },
  ) {
    // 1. Security: Verify Signature
    const webhookSecret =
      this.configService.get<RazorpayConfig>('razorpay')?.webhookSecret;

    if (!webhookSecret) {
      this.logger.error(
        'RAZORPAY_WEBHOOK_SECRET is not defined in configuration',
      );
      // We return 200 to gateway but log error internally to avoid exposing config issues
      return { status: 'config_missing' };
    }

    if (!signature) {
      throw new BadRequestException('Missing signature');
    }

    // Razorpay sends raw body usually, but since NestJS parses JSON,
    // we stringify it back. For 100% accuracy with some gateways,
    // raw body buffers are preferred.
    // Use rawBody for accurate signature verification
    const rawBody = req.rawBody || JSON.stringify(body);
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('Invalid webhook signature attempt');
      throw new BadRequestException('Invalid signature');
    }

    const event = body.event as string;
    const payload = (body.payload as Record<string, unknown>)?.payout as
      | Record<string, unknown>
      | undefined;
    const entity = payload?.entity as Record<string, unknown> | undefined;

    if (!entity || !entity.reference_id) {
      return { status: 'ignored' };
    }

    const withdrawalId = entity.reference_id as string;

    if (!withdrawalId) {
      return { status: 'invalid_id' };
    }

    if (event === 'payout.failed' || event === 'payout.reversed') {
      await this.walletService.updateWithdrawalStatus(
        withdrawalId,
        WithdrawalStatus.REVERSED,
        'system_admin', // System Admin ID
        `Auto-refunded: ${(entity.failure_reason as string) || 'Gateway Failure'}`,
      );
      return { status: 'refunded' };
    }

    if (event === 'payout.processed') {
      await this.walletService.updateWithdrawalStatus(
        withdrawalId,
        WithdrawalStatus.SUCCESS,
        'system_admin', // System Admin ID
        'Payout confirmed by gateway',
      );
      return { status: 'success_recorded' };
    }

    return { status: 'event_ignored' };
  }
}
