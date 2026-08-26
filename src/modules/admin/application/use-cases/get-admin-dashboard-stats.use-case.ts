import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { ChatSession } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';
import {
  Transaction,
  TransactionType,
  TransactionPurpose,
} from '@/modules/finance/wallet/infrastructure/entities/transaction.entity';

@Injectable()
export class GetAdminDashboardStatsUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ChatSession)
    private readonly chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Single query: all user/expert/client stats + latest 5 of each role
    const [
      expertStats,
      clientStats,
      chatSessionsCount,
      earningsResult,
      latestUsers,
    ] = await Promise.all([
      // Expert stats
      this.userRepository
        .createQueryBuilder('user')
        .leftJoin(ProfileExpert, 'profile', 'profile.user_id = "user".id')
        .select([
          'COUNT(*) AS total_experts',
          'COUNT(*) FILTER (WHERE profile.kyc_status = :approved) AS active_experts',
          'COUNT(*) FILTER (WHERE profile.kyc_status = :pending) AS pending_experts',
          'COUNT(*) FILTER (WHERE profile.kyc_status = :rejected) AS rejected_experts',
          'COUNT(*) FILTER (WHERE "user".is_blocked = true) AS blocked_experts',
          'COUNT(*) FILTER (WHERE "user".created_at >= :today) AS recent_experts',
        ])
        .where(':role = ANY("user".roles)', { role: RoleEnum.EXPERT })
        .setParameters({
          approved: 'approved',
          pending: 'pending',
          rejected: 'rejected',
          today,
        })
        .getRawOne<{
          total_experts: string;
          active_experts: string;
          pending_experts: string;
          rejected_experts: string;
          blocked_experts: string;
          recent_experts: string;
        }>(),

      // Client stats
      this.userRepository
        .createQueryBuilder('user')
        .leftJoin(ClientAccount, 'profile', 'profile.user_id = user.id')
        .select([
          'COUNT(*) AS total_clients',
          'COUNT(*) FILTER (WHERE user.created_at >= :today) AS recent_clients',
          'COUNT(*) FILTER (WHERE profile.is_blocked = true) AS blocked_clients',
        ])
        .where(':role = ANY(user.roles)', { role: RoleEnum.CLIENT })
        .setParameter('today', today)
        .getRawOne<{
          total_clients: string;
          recent_clients: string;
          blocked_clients: string;
        }>(),

      // Total chat sessions count
      this.chatSessionRepository.count(),

      // Global earnings + admin commission in one query
      this.transactionRepository
        .createQueryBuilder('t')
        .select([
          `SUM(t.amount) FILTER (WHERE t.purpose = :rechargePurpose AND t.type = :creditType) AS total_earnings`,
          `SUM(t.amount) FILTER (WHERE t.type = :debitType AND t.purpose IN (:...commissionPurposes)) AS commission_base`,
        ])
        .setParameters({
          rechargePurpose: TransactionPurpose.RECHARGE,
          creditType: TransactionType.CREDIT,
          debitType: TransactionType.DEBIT,
          commissionPurposes: [
            TransactionPurpose.CONSULTATION,
            TransactionPurpose.PRODUCT_PURCHASE,
            TransactionPurpose.PUJA_CONFIRMATION,
          ],
        })
        .getRawOne<{ total_earnings: string; commission_base: string }>(),

      // Latest 15 users across all roles (client, expert, agent) — sorted in DB
      this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.name',
          'user.email',
          'user.role',
          'user.created_at',
        ])
        .where('user.role && ARRAY[:...roles]::varchar[]', {
          roles: [RoleEnum.CLIENT, RoleEnum.EXPERT, RoleEnum.AGENT],
        })
        .orderBy('user.created_at', 'DESC')
        .take(15)
        .getMany(),
    ]);

    const totalEarnings = Number(earningsResult?.total_earnings) || 0;
    const adminEarnings = (Number(earningsResult?.commission_base) || 0) * 0.03;

    // Map latest users to activities (single pass, no extra queries)
    const activities = latestUsers
      .map((u) => {
        const isExpert = u.role === RoleEnum.EXPERT;
        const isAgent = u.role === RoleEnum.AGENT;
        const role = isAgent ? 'agent' : isExpert ? 'expert' : 'client';
        const colorMap = {
          agent: 'bg-green-500',
          expert: 'bg-purple-500',
          client: 'bg-blue-500',
        };
        return {
          id: `${role}-${u.id}`,
          name: u.name || u.email,
          action: `joined as a ${role}`,
          createdAt: u.created_at,
          avatar: (u.name || role.charAt(0)).charAt(0).toUpperCase(),
          color: colorMap[role],
          time: this.formatTime(u.created_at),
        };
      })
      .slice(0, 10);

    return {
      totalChatSessions: chatSessionsCount,
      totalExperts: Number(expertStats?.total_experts) || 0,
      totalUsers: Number(clientStats?.total_clients) || 0,
      totalEarnings,
      adminEarnings,
      trends: {
        recent: Number(expertStats?.recent_experts) || 0,
      },
      activities,
    };
  }

  private formatTime(date: Date): string {
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
