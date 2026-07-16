import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import {
  CommissionsFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/commissions/application/commissions.facade';

export interface MerchantEarningsStats {
  grossTotal: number;
  netTotal: number;
  grossMonthly: number;
  netMonthly: number;
}

@Injectable()
export class CalculateMerchantEarningsUseCase {
  constructor(
    private readonly orderFacade: OrderFacade,
    private readonly commissionsFacade: CommissionsFacade,
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepo: Repository<ProfileMerchant>,
  ) {}

  async execute(userId: string): Promise<MerchantEarningsStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [grossTotal, grossMonthly, merchantProfile] = await Promise.all([
      this.orderFacade.getMerchantGrossTotalEarnings(userId),
      this.orderFacade.getMerchantGrossMonthlyEarnings(userId, startOfMonth),
      this.merchantRepo.findOne({
        where: { user_id: userId },
        select: ['id'],
      }),
    ]);

    const merchantId = merchantProfile?.id || null;

    const calculateNet = async (gross: number) => {
      if (gross <= 0) return 0;
      const [feeResult, gstResult] = await Promise.all([
        this.commissionsFacade.resolveCommission(
          CommissionEventType.PRODUCT_ORDER,
          CommissionType.PLATFORM_FEE,
          merchantId,
          CommissionAppliesRole.MERCHANT,
          gross,
        ),
        this.commissionsFacade.resolveCommission(
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
