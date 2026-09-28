import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PaymentsService } from '@/internal/finance/payments/payments.service';
import { ClientWallet } from '../entities/client-wallet.entity';
import { VerifyRechargeDto } from '../dto/verify-recharge.dto';

@Injectable()
export class VerifyWalletRechargeUseCase {
  private readonly logger = new Logger(VerifyWalletRechargeUseCase.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    @InjectRepository(ClientWallet)
    private readonly clientWalletRepo: Repository<ClientWallet>,
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

    const wallet = await this.clientWalletRepo.findOne({
      where: { client_id: clientId },
      select: {
        id: true,
        balance: true,
      },
    });

    return {
      success: true,
      message: 'Wallet recharged successfully',
      balance: wallet?.balance || 0,
    };
  }
}
