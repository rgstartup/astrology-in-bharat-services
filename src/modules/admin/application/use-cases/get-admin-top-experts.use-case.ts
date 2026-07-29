import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { PujaAppointmentFacade } from '@/modules/puja-appointment/application/puja-appointment.facade';

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
  ) {}

  async execute(limit: number = 5) {
    // 1. Fetch all experts who have a profile
    const profiles = await this.usersFacade.getExpertsForRevenue();

    // 2. Fetch all aggregated stats in exactly 3 queries, avoiding N+1 problem (OOM Crash fix)
    const [chatStatsMap, callStatsMap, pujaStatsMap] = await Promise.all([
      this.chatFacade.getAllExpertsRevenueAndCount(),
      this.callFacade.getAllExpertsRevenueAndCount(),
      this.pujaFacade.getAllExpertsRevenueAndCount(),
    ]);

    // 3. Map the stats in-memory (Super fast, O(N) CPU time, O(1) DB queries)
    const results = profiles.map((expert) => {
      const expertProfileId = (expert as unknown as { profile_expert?: { id: string } }).profile_expert?.id;
      if (!expertProfileId) return null;

      const chatStats = chatStatsMap[expertProfileId] || { total: 0, count: 0 };
      const callStats = callStatsMap[expertProfileId] || { total: 0, count: 0 };
      const pujaStats = pujaStatsMap[expertProfileId] || { total: 0, count: 0 };
      
      // Note: E-commerce products are sold by Merchants, not Experts, so we exclude product stats.
      const totalRevenue = chatStats.total + callStats.total + pujaStats.total;
      const totalConsultations = chatStats.count + callStats.count + pujaStats.count;

      return {
        name: expert.name,
        revenue: totalRevenue,
        consultations: totalConsultations,
        rating: 4.8, // placeholder
      };
    }).filter(Boolean);

    // 4. Sort by revenue and return limited results
    return results.sort((a, b) => b!.revenue - a!.revenue).slice(0, limit);
  }
}
