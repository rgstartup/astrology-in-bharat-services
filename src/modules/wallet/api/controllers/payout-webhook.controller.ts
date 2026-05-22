import { Controller, Post, Body, Headers, BadRequestException, HttpCode, Req } from '@nestjs/common';
import { WalletFacade } from '../../application/wallet.facade';
import { WithdrawalStatus } from '../../infrastructure/entities/withdrawal.entity';
import * as crypto from 'crypto';

@Controller('wallet/webhooks/payouts')
export class PayoutWebhookController {
    constructor(private readonly walletFacade: WalletFacade) { }

    @Post()
    @HttpCode(200)
    async handleWebhook(
        @Body() body: any,
        @Headers('x-razorpay-signature') signature: string,
        @Req() req: any,
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
        // Use rawBody for accurate signature verification
        const rawBody = req.rawBody || JSON.stringify(body);
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(rawBody)
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

        const withdrawalId = payload.reference_id;

        if (!withdrawalId) {
            return { status: 'invalid_id' };
        }

        if (event === 'payout.failed' || event === 'payout.reversed') {
            await this.walletFacade.updateWithdrawalStatus(
                withdrawalId,
                WithdrawalStatus.REVERSED,
                'system_admin', // System Admin ID
                `Auto-refunded: ${payload.failure_reason || 'Gateway Failure'}`
            );
            return { status: 'refunded' };
        }

        if (event === 'payout.processed') {
            await this.walletFacade.updateWithdrawalStatus(
                withdrawalId,
                WithdrawalStatus.SUCCESS,
                'system_admin', // System Admin ID
                'Payout confirmed by gateway'
            );
            return { status: 'success_recorded' };
        }

        return { status: 'event_ignored' };
    }
}
