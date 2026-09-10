import { Controller, Get } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { OrderFacade } from '@/modules/client/commerce/order/application/order.facade';
import { ChatFacade } from '@/modules/consultation/chat/chat.facade';
import { AdminFacade } from '../admin.facade';

@Controller({
  path: 'public/stats',
  version: '1',
})
export class PublicStatsController {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly orderFacade: OrderFacade,
    private readonly chatFacade: ChatFacade,
    private readonly adminFacade: AdminFacade,
  ) {}

  @Public()
  @Get('merchant-hub')
  async getMerchantHubStats() {
    try {
      const [totalMerchants, totalOrders] = await Promise.all([
        this.usersFacade.getUsersCountByRole(RoleEnum.MERCHANT),
        this.orderFacade.getSuccessfulOrdersCount(),
      ]);

      return {
        success: true,
        data: {
          totalMerchants: totalMerchants,
          totalProductsSold: totalOrders,
          realMerchants: totalMerchants,
          realOrders: totalOrders,
        },
      };
    } catch (error) {
      console.error(
        '[PublicStatsController] Error fetching merchant stats:',
        error,
      );
      return {
        success: false,
        message: 'Failed to fetch stats',
        data: {
          totalMerchants: 0,
          totalProductsSold: 0,
        },
      };
    }
  }

  @Public()
  @Get('expert-hub')
  async getExpertHubStats() {
    try {
      const [total_experts, totalServices] = await Promise.all([
        this.usersFacade.getUsersCountByRole(RoleEnum.EXPERT),
        this.chatFacade.getTotalSessionsCount(),
      ]);

      return {
        success: true,
        data: {
          total_experts: total_experts,
          totalServices: totalServices,
          realExperts: total_experts,
          realServices: totalServices,
        },
      };
    } catch (error) {
      console.error(
        '[PublicStatsController] Error fetching expert stats:',
        error,
      );
      return {
        success: false,
        message: 'Failed to fetch expert stats',
        data: {
          total_experts: 1200,
          totalServices: 45000,
        },
      };
    }
  }

  @Public()
  @Get('platform-stats')
  async getPlatformStats() {
    const result = await this.adminFacade.getPlatformStats();

    return {
      success: true,
      data: {
        ...result,
      },
    };
  }
}
