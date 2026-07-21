import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';

@Injectable()
export class GetAdminDashboardStatsUseCase {
  constructor(
    @Inject(forwardRef(() => UsersFacade))
    private readonly usersFacade: UsersFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
  ) {}

  async execute() {
    const expertStats = await this.usersFacade.getExpertStats();
    const clientStats = await this.usersFacade.getClientStats();
    const chatSessionsCount = await this.chatFacade.getTotalSessionsCount();
    const total_earnings = await this.walletFacade.getGlobalEarnings();

    // Fetch recent activities
    const [latestUsers, latestExperts, latestAgents] = await Promise.all([
      this.usersFacade.findAllByRole('client', undefined, 1, 5),
      this.usersFacade.findAllByRole('expert', undefined, 1, 5),
      this.usersFacade.findAllByRole('agent', undefined, 1, 5),
    ]);

    const activities = [
      ...latestUsers.items.map(
        (
          u: import('@/modules/users/infrastructure/entities/user.entity').User,
        ) => ({
          id: `client-${u.id}`,
          name: u.name || u.email,
          action: 'joined as a client',
          createdAt: u.created_at,
          avatar: (u.name || 'C').charAt(0).toUpperCase(),
          color: 'bg-blue-500',
        }),
      ),
      ...latestExperts.items.map(
        (
          u: import('@/modules/users/infrastructure/entities/user.entity').User,
        ) => ({
          id: `expert-${u.id}`,
          name: u.name || u.email,
          action: 'joined as an expert',
          createdAt: u.created_at,
          avatar: (u.name || 'E').charAt(0).toUpperCase(),
          color: 'bg-purple-500',
        }),
      ),
      ...latestAgents.items.map(
        (
          u: import('@/modules/users/infrastructure/entities/user.entity').User,
        ) => ({
          id: `agent-${u.id}`,
          name: u.name || u.email,
          action: 'joined as an agent',
          createdAt: u.created_at,
          avatar: (u.name || 'A').charAt(0).toUpperCase(),
          color: 'bg-green-500',
        }),
      ),
    ]
      .sort(
        (a: { createdAt: Date }, b: { createdAt: Date }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 10)
      .map(
        (activity: {
          id: string;
          name: string;
          action: string;
          createdAt: Date;
          avatar: string;
          color: string;
        }) => ({
          ...activity,
          time: this.formatTime(activity.createdAt),
        }),
      );

    const admin_earnings = await this.walletFacade.getAdminCommission();

    return {
      totalChatSessions: chatSessionsCount,
      totalExperts: expertStats.totalExperts,
      totalUsers: clientStats.totalUsers,
      totalEarnings: total_earnings,
      adminEarnings: admin_earnings,
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
