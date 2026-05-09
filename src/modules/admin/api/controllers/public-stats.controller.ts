import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { Order, OrderStatus } from '@/modules/order/infrastructure/entities/order.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
  path: 'public/stats',
  version: '1',
})
export class PublicStatsController {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepo: Repository<ProfileMerchant>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ProfileExpert)
    private readonly expertRepo: Repository<ProfileExpert>,
  ) {}

  @Public()
  @Get('merchant-hub')
  async getMerchantHubStats() {
    try {
      const [totalMerchants, totalOrders] = await Promise.all([
        this.merchantRepo.count(),
        this.orderRepo.count({
          where: {
            status: In([
              OrderStatus.DELIVERED,
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.PROCESSING,
              OrderStatus.PACKED
            ])
          }
        })
      ]);

      return {
        success: true,
        data: {
          totalMerchants: totalMerchants,
          totalProductsSold: totalOrders,
          realMerchants: totalMerchants,
          realOrders: totalOrders
        }
      };
    } catch (error) {
      console.error('[PublicStatsController] Error fetching merchant stats:', error);
      return {
        success: false,
        message: 'Failed to fetch stats',
        data: {
          totalMerchants: 0,
          totalProductsSold: 0
        }
      };
    }
  }

  @Public()
  @Get('expert-hub')
  async getExpertHubStats() {
    try {
      const [totalExperts, servicesData] = await Promise.all([
        this.userRepo
          .createQueryBuilder('user')
          .innerJoin('user.roles', 'role')
          .where('role.name = :role', { role: 'expert' })
          .getCount(),
        this.expertRepo
          .createQueryBuilder('expert')
          .select('SUM(expert.consultation_count)', 'totalServices')
          .getRawOne()
      ]);

      const totalServices = parseInt(servicesData.totalServices || 0);
      
      return {
        success: true,
        data: {
          totalExperts: totalExperts,
          totalServices: totalServices,
          realExperts: totalExperts,
          realServices: totalServices
        }
      };
    } catch (error) {
      console.error('[PublicStatsController] Error fetching expert stats:', error);
      return {
        success: false,
        message: 'Failed to fetch expert stats',
        data: {
          totalExperts: 1200,
          totalServices: 45000
        }
      };
    }
  }
}
