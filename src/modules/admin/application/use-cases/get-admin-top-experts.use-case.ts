import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { PujaAppointmentFacade } from '@/modules/puja-appointment/application/puja-appointment.facade';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';

@Injectable()
export class GetAdminTopExpertsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
    @Inject(forwardRef(() => PujaAppointmentFacade))
    private readonly pujaFacade: PujaAppointmentFacade,
    @Inject(forwardRef(() => OrderFacade))
    private readonly orderFacade: OrderFacade,
  ) {}

  async execute(limit: number = 5) {
    // Rank all experts by their total aggregate revenue
    const profiles = await this.usersFacade.getExpertsForRevenue();

    const results = (
      await Promise.all(
        profiles.map(async (expert) => {
          if (!(expert as { profile_expert?: { id: string } }).profile_expert)
            return null;
          const expertProfileId = (
            expert as unknown as { profile_expert: { id: string } }
          ).profile_expert.id;

          // 1. Chat Revenue
          const chatStats =
            await this.chatFacade.getExpertRevenueAndCount(expertProfileId);

          // 2. Call Revenue
          const callStats = await this.callFacade.getExpertRevenueAndCount(
            expertProfileId as unknown as number,
          );

          // 3. Puja Revenue
          const pujaStats =
            await this.pujaFacade.getExpertRevenueAndCount(expertProfileId);

          // 4. Product Revenue
          const productStats =
            await this.orderFacade.getExpertProductRevenueAndCount(
              expertProfileId as unknown as number,
            );

          const totalRevenue =
            (chatStats?.total ?? 0) +
            (callStats?.total ?? 0) +
            (pujaStats?.total ?? 0) +
            (productStats?.total ?? 0);

          const totalConsultations =
            (chatStats?.count ?? 0) +
            (callStats?.count ?? 0) +
            (pujaStats?.count ?? 0) +
            (productStats?.count ?? 0);

          return {
            name: expert.name,
            revenue: totalRevenue,
            consultations: totalConsultations,
            rating: 4.8, // placeholder
          };
        }),
      )
    ).filter(Boolean);

    // Sort by revenue and return limited results
    return results.sort((a, b) => b!.revenue - a!.revenue).slice(0, limit);
  }
}
