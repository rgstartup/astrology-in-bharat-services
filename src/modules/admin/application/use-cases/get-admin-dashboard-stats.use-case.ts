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
  ) { }

  async execute() {
    const expertStats = await this.usersFacade.getExpertStats();
    const userStats = await this.usersFacade.getUserStats();
    const chatSessionsCount = await this.chatFacade.getTotalSessionsCount();
    const totalEarnings = await this.walletFacade.getGlobalEarnings();

    // Fetch recent activities
    const [latestUsers, latestExperts, latestAgents] = await Promise.all([
      this.usersFacade.findAllByRole('client', undefined, 1, 5),
      this.usersFacade.findAllByRole('expert', undefined, 1, 5),
      this.usersFacade.findAllByRole('agent', undefined, 1, 5),
    ]);

    const activities = [
      ...latestUsers.items.map((u: any) => ({
        id: `user-${u.id}`,
        name: u.name || u.email,
        action: 'joined as a user',
        createdAt: u.created_at,
        avatar: (u.name || 'U').charAt(0).toUpperCase(),
        color: 'bg-blue-500',
      })),
      ...latestExperts.items.map((u: any) => ({
        id: `expert-${u.id}`,
        name: u.name || u.email,
        action: 'joined as an expert',
        createdAt: u.created_at,
        avatar: (u.name || 'E').charAt(0).toUpperCase(),
        color: 'bg-purple-500',
      })),
      ...latestAgents.items.map((u: any) => ({
        id: `agent-${u.id}`,
        name: u.name || u.email,
        action: 'joined as an agent',
        createdAt: u.created_at,
        avatar: (u.name || 'A').charAt(0).toUpperCase(),
        color: 'bg-green-500',
      })),
    ]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((activity: any) => ({
        ...activity,
        time: this.formatTime(activity.createdAt),
      }));

    const adminEarnings = await this.walletFacade.getAdminCommission();

    return {
      totalChatSessions: chatSessionsCount,
      totalExperts: expertStats.totalExperts,
      totalUsers: userStats.totalUsers,
      totalEarnings: totalEarnings,
      adminEarnings: adminEarnings,
      trends: expertStats.trends,
      activities: activities,
    };
  }

  private formatTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}
