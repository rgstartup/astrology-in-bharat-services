import { Controller, Get } from '@nestjs/common';
import { Public } from '@/shared/decorators/public.decorator';
import { RoleEnum } from '@/internal/users/enums/Role.enum';
import { UsersService } from '@/internal/users/users.service';
import { OrderService } from '@/internal/commerce/order/order.service';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { AdminService } from '../admin.service';

@Controller({
  path: 'public/stats',
  version: '1',
})
export class PublicStatsController {
  constructor(
    private readonly usersService: UsersService,
    private readonly orderService: OrderService,
    private readonly chatService: ChatService,
    private readonly adminService: AdminService,
  ) {}

  @Public()
  @Get('merchant-hub')
  async getMerchantHubStats() {
    try {
      const [totalMerchants, totalOrders] = await Promise.all([
        this.usersService.getUsersCountByRole(RoleEnum.MERCHANT),
        this.orderService.getSuccessfulOrdersCount(),
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
        this.usersService.getUsersCountByRole(RoleEnum.EXPERT),
        this.chatService.getTotalSessionsCount(),
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
    const result = await this.adminService.getPlatformStats();

    return {
      success: true,
      data: {
        ...result,
      },
    };
  }
}
