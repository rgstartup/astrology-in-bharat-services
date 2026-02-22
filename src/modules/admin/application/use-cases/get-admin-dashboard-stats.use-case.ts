import { Injectable } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { ChatFacade } from '@/modules/chat/application/chat.facade';

@Injectable()
export class GetAdminDashboardStatsUseCase {
  constructor(
    private readonly usersFacade: UsersFacade,
    private readonly walletFacade: WalletFacade,
    private readonly chatFacade: ChatFacade,
  ) {}

  async execute() {
    const expertStats = await this.usersFacade.getExpertStats();
    const userStats = await this.usersFacade.getUserStats();
    const chatSessionsCount = await this.chatFacade.getTotalSessionsCount();
    const totalEarnings = await this.walletFacade.getGlobalEarnings();

    return {
      totalChatSessions: chatSessionsCount,
      totalExperts: expertStats.totalExperts,
      totalUsers: userStats.totalUsers,
      totalEarnings: totalEarnings,
      trends: expertStats.trends,
    };
  }
}
