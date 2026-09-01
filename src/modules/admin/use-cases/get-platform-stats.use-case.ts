import { OrderStatus } from '@/modules/client/commerce/order/infrastructure/entities/order.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GetPlatformStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  async execute() {
    const raw = await this.userRepo
      .createQueryBuilder()
      .select([
        `(SELECT COUNT(*)
      FROM public.users
      WHERE platform = 'client') AS clients`,

        `(SELECT COUNT(*)
      FROM public.users u
      INNER JOIN expert.profile e ON e.user_id = u.id
      WHERE u.platform = 'expert'
        AND e.kyc_status = 'approved') AS verified_experts`,

        `(SELECT COUNT(*)
      FROM commerce.product_orders
      WHERE status IN (:...statuses)) AS successful_orders`,

        `(SELECT COUNT(*)
      FROM consultations.chat_sessions) AS chat_sessions`,
      ])
      .setParameter('statuses', [
        OrderStatus.DELIVERED,
        OrderStatus.PAID,
        OrderStatus.SHIPPED,
        OrderStatus.PROCESSING,
        OrderStatus.PACKED,
      ])
      .getRawOne<{
        clients: string;
        verified_experts: string;
        successful_orders: string;
        chat_sessions: string;
      }>();

    return {
      clients: Number(raw?.clients ?? 0),
      verified_experts: Number(raw?.verified_experts ?? 0),
      successful_orders: Number(raw?.successful_orders ?? 0),
      chat_sessions: Number(raw?.chat_sessions ?? 0),
    };
  }
}
