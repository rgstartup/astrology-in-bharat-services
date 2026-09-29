import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientWallets } from '@/core/drizzledb/schema';
import { PaymentsService } from '@/internal/finance/payments/payments.service';
import { VerifyRechargeDto } from '../dto/verify-recharge.dto';

@Injectable()
export class VerifyWalletRechargeUseCase {
  private readonly logger = new Logger(VerifyWalletRechargeUseCase.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(clientId: number, dto: VerifyRechargeDto) {
    this.logger.log(
      `Verifying wallet recharge for client ${clientId}, order: ${dto.razorpay_order_id}`,
    );

    await this.paymentsService.verifyPayment({
      razorpay_order_id: dto.razorpay_order_id,
      razorpay_payment_id: dto.razorpay_payment_id,
      razorpay_signature: dto.razorpay_signature,
    });

    const [wallet] = await this.db
      .select({
        id: clientWallets.id,
        balance: clientWallets.balance,
      })
      .from(clientWallets)
      .where(eq(clientWallets.client_id, Number(clientId)))
      .limit(1);

    return {
      success: true,
      message: 'Wallet recharged successfully',
      balance: wallet ? Number(wallet.balance) : 0,
    };
  }
}
