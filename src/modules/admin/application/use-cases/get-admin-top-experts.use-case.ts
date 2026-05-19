import { Injectable } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { GetExpertPujaAppointmentsUseCase } from '@/modules/puja-appointment/application/use-cases/get-expert-puja-appointments.use-case';
import { OrderFacade } from '@/modules/commerce/order/application/order.facade';

@Injectable()
export class GetAdminTopExpertsUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly chatFacade: ChatFacade,
    private readonly callFacade: CallFacade,
    private readonly getExpertPujaAppointmentsUseCase: GetExpertPujaAppointmentsUseCase,
    private readonly orderFacade: OrderFacade,
  ) { }

  async execute(limit: number = 5) {
    // Rank all experts by their total aggregate revenue
    const profiles = await this.usersFacade.getExpertsForRevenue();

    const results = (await Promise.all(profiles.map(async (expert) => {
      if (!expert.profile_expert) return null;
      const expertProfileId = expert.profile_expert.id;

      // 1. Chat Revenue
      const chatStats = await this.chatFacade.getExpertRevenueAndCount(expertProfileId);

      // 2. Call Revenue
      const callStats = await this.callFacade.getExpertRevenueAndCount(expertProfileId);

      // 3. Puja Revenue
      const pujaStats = await this.getExpertPujaAppointmentsUseCase.getRevenueAndCount(expertProfileId);

      // 4. Product Revenue
      const productStats = await this.orderFacade.getExpertProductRevenueAndCount(expertProfileId);

      const totalRevenue = 
        chatStats.total + 
        callStats.total + 
        pujaStats.total + 
        productStats.total;

      const totalConsultations = 
        chatStats.count + 
        callStats.count + 
        pujaStats.count + 
        productStats.count;

      return {
        name: expert.name,
        revenue: totalRevenue,
        consultations: totalConsultations,
        rating: 4.8 // placeholder
      };
    }))).filter(Boolean);

    // Sort by revenue and return limited results
    return results
      .sort((a, b) => b!.revenue - a!.revenue)
      .slice(0, limit);
  }
}
