import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from '@/internal/commerce/order/order.service';
import { MerchantAccount } from '@/internal/domains/merchant/account/entities/account.entity';
import {
  CommissionsService,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/internal/finance/commissions/commissions.service';

export interface MerchantEarningsStats {
  grossTotal: number;
  netTotal: number;
  grossMonthly: number;
  netMonthly: number;
}

@Injectable()
export class CalculateMerchantEarningsUseCase {
  constructor(
    private readonly orderService: OrderService,
    private readonly commissionsService: CommissionsService,
    @InjectRepository(MerchantAccount)
    private readonly merchantRepo: Repository<MerchantAccount>,
  ) {}

  async execute(userId: number): Promise<MerchantEarningsStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [grossTotal, grossMonthly, merchantProfile] = await Promise.all([
      this.orderService.getMerchantGrossTotalEarnings(userId),
      this.orderService.getMerchantGrossMonthlyEarnings(userId, startOfMonth),
      this.merchantRepo.findOne({
        where: { user_id: userId },
        select: ['id'],
      }),
    ]);

    const merchantId = merchantProfile?.id || null;

    const calculateNet = async (gross: number) => {
      if (gross <= 0) return 0;
      const [feeResult, gstResult] = await Promise.all([
        this.commissionsService.resolveCommission(
          CommissionEventType.PRODUCT_ORDER,
          CommissionType.PLATFORM_FEE,
          merchantId,
          CommissionAppliesRole.MERCHANT,
          gross,
        ),
        this.commissionsService.resolveCommission(
          CommissionEventType.PRODUCT_ORDER,
          CommissionType.GST,
          merchantId,
          CommissionAppliesRole.MERCHANT,
          gross,
        ),
      ]);
      return Number((gross - feeResult.amount - gstResult.amount).toFixed(2));
    };

    const [netTotal, netMonthly] = await Promise.all([
      calculateNet(grossTotal),
      calculateNet(grossMonthly),
    ]);

    return {
      grossTotal,
      netTotal,
      grossMonthly,
      netMonthly,
    };
  }
}
