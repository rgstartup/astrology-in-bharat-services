import { Controller, Post, Body, Headers, BadRequestException, HttpCode } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { WithdrawalStatus } from '../../infrastructure/persistence/entities/withdrawal.entity';
import * as crypto from 'crypto';

@Controller('wallet/webhooks/payouts')
export class PayoutWebhookController {
    constructor(private readonly walletFacade: WalletFacade) { }

    @Post()
    @HttpCode(200)
    async handleWebhook(
        @Body() body: any,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        // 1. Security: Verify Signature
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not defined in environment variables');
            // We return 200 to gateway but log error internally to avoid exposing config issues
            return { status: 'config_missing' };
        }

        if (!signature) {
            throw new BadRequestException('Missing signature');
        }

        // Razorpay sends raw body usually, but since NestJS parses JSON, 
        // we stringify it back. For 100% accuracy with some gateways, 
        // raw body buffers are preferred.
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');

        if (signature !== expectedSignature) {
            console.warn('Invalid webhook signature attempt');
            throw new BadRequestException('Invalid signature');
        }

        const event = body.event;
        const payload = body.payload?.payout?.entity;

        if (!payload || !payload.reference_id) {
            return { status: 'ignored' };
        }

        const withdrawalId = parseInt(payload.reference_id);

        if (isNaN(withdrawalId)) {
            return { status: 'invalid_id' };
        }

        if (event === 'payout.failed' || event === 'payout.reversed') {
            await this.walletFacade.updateWithdrawalStatus(
                withdrawalId,
                WithdrawalStatus.FAILED,
                0, // System Admin ID
                `Auto-refunded: ${payload.failure_reason || 'Gateway Failure'}`
            );
            return { status: 'refunded' };
        }

        return { status: 'event_ignored' };
    }
}
