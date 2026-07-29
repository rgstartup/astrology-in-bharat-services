import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { AgentListing } from '../../infrastructure/entities/agent-listing.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { GetAgentStatsDto } from '../../api/dto/get-agent-stats.dto';
import { IUser } from '@/common/types/access-token.payload';
import {
  CommissionsFacade,
  CommissionEventType,
  CommissionType,
  CommissionAppliesRole,
} from '@/modules/finance/commissions/application/commissions.facade';

type UserStatShape = {
  id: string;
  name: string | null;
  email: string;
  totalSpending: number;
  sessionCount: number;
  registeredAt: Date;
};

@Injectable()
export class GetAgentStatsUseCase {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    private readonly commissionsFacade: CommissionsFacade,
    private readonly usersFacade: UsersFacade,
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @InjectRepository(AgentListing)
    private readonly agentListingRepo: Repository<AgentListing>,
  ) {}

  async execute(user: IUser, dto: GetAgentStatsDto) {
    const range = dto.range || '30d';
    const dateRangeDto = dto;
    const userId = user.id;
    const queryRunner = this.databaseService.getQueryRunner();
    await queryRunner.connect();

    try {
      const profileWhere = user.profile
        ? { id: user.profile, user_id: userId }
        : { user_id: userId };
      const profile = await this.profileAgentRepo.findOne({
        where: profileWhere,
      });

      if (!profile) {
        throw new BadRequestException('Agent profile not found');
      }

      let fromDate = "NOW() - INTERVAL '30 days'";
      let _chartInterval = "INTERVAL '30 days'";

      if (range === '7d') {
        fromDate = "NOW() - INTERVAL '7 days'";
        _chartInterval = "INTERVAL '7 days'";
      } else if (range === '6m') {
        fromDate = "NOW() - INTERVAL '6 months'";
        _chartInterval = "INTERVAL '6 months'";
      } else if (range === '1y') {
        fromDate = "NOW() - INTERVAL '1 year'";
        _chartInterval = "INTERVAL '1 year'";
      } else if (
        range === 'custom' &&
        dateRangeDto?.startDate &&
        dateRangeDto?.endDate
      ) {
        fromDate = `'${dateRangeDto.startDate}'::date`;
        const end = `'${dateRangeDto.endDate}'::date`;
        _chartInterval = `AGE(${end}, ${fromDate})`;
      }

      // Build list of registered IDs from agent profile
      const registeredUserIds = (profile?.registered_user_ids || []).filter(
        (id) => id && typeof id === 'string',
      );
      const registeredAstrologerIds = (
        profile?.registered_astrologer_ids || []
      ).filter((id) => id && typeof id === 'string');
      const allRegisteredIds = Array.from(
        new Set([...registeredUserIds, ...registeredAstrologerIds]),
      );

      // Count agent-referred users using raw SQL (only agent's own data)
      const totalUsersCountResult: Array<{ count: string }> =
        await queryRunner.manager.query(
          `SELECT COUNT(DISTINCT u.id)::int as count
           FROM public.users u
           WHERE u.referred_by_id = $1
           ${allRegisteredIds.length > 0 ? `OR u.id = ANY($2)` : ''}`,
          allRegisteredIds.length > 0 ? [userId, allRegisteredIds] : [userId],
        );
      const totalUsersCount = Number(totalUsersCountResult[0]?.count || 0);

      const totalMandirs = await this.agentListingRepo.count({
        where: { agent_id: userId, type: 'mandir' },
      });
      const totalPujaShops = await this.agentListingRepo.count({
        where: { agent_id: userId, type: 'puja_shop' },
      });

      // Use UsersFacade — no direct cross-module entity imports
      const usersForStats = (await this.usersFacade.getFilteredUsersList(
        {},
      )) as UserStatShape[];

      const [expertCommResult, clientCommResult, shopCommResult] =
        await Promise.all([
          this.commissionsFacade.resolveCommission(
            CommissionEventType.CHAT,
            CommissionType.SELLER_AGENT,
            null,
            CommissionAppliesRole.EXPERT,
            100,
          ),
          this.commissionsFacade.resolveCommission(
            CommissionEventType.CHAT,
            CommissionType.BUYER_AGENT,
            null,
            CommissionAppliesRole.CLIENT,
            100,
          ),
          this.commissionsFacade.resolveCommission(
            CommissionEventType.PRODUCT_ORDER,
            CommissionType.SELLER_AGENT,
            null,
            CommissionAppliesRole.MERCHANT,
            100,
          ),
        ]);
      const expertCommPercent = expertCommResult.amount;
      const clientCommPercent = clientCommResult.amount;
      const shopCommPercent = shopCommResult.amount;

      let expertEarnings = 0;
      const shopEarnings = 0;
      const mandirEarnings = 0;
      const clientEarnings = 0;
      let astrologersCount = 0;
      let clientsCount = 0;
      let merchantsAsPujaShopCount = 0;
      let usersWithActivity = 0;

      // UsersFacade returns { totalSpending, sessionCount } — use those as activity indicators
      usersForStats.forEach((u) => {
        // Since UsersFacade only returns clients, count all as clients
        clientsCount++;

        const spending = Number(u.totalSpending || 0);
        const sessCount = Number(u.sessionCount || 0);
        if (spending > 0 || sessCount > 0) usersWithActivity++;
      });

      // Commission breakdown by role via raw SQL (agent's own commission data — stays here)
      const roleStats: Array<{ role_name: string; total_comm: number }> =
        await queryRunner.manager.query(
          `
                SELECT 
                    u.role_name,
                    SUM(s.agent_commission)::float as total_comm
                FROM (
                    SELECT expert_id, agent_id, agent_commission FROM consultations.chat_sessions WHERE agent_id = $1
                    UNION ALL
                    SELECT expert_id, agent_id, agent_commission FROM consultations.call_sessions WHERE agent_id = $1
                ) s
                JOIN (
                    SELECT pe.id as expert_id, unnest(u.roles) as role_name
                    FROM expert.profile pe
                    JOIN public.users u ON u.id = pe.user_id
                ) u ON u.expert_id = s.expert_id
                GROUP BY u.role_name
            `,
          [userId],
        );

      expertEarnings =
        roleStats.find((r) => r.role_name === 'expert')?.total_comm || 0;

      const withdrawalStats = await this.walletFacade.getWithdrawalsStatus(
        profile.id,
        'agent_id',
      );

      const revenueGrowthRaw: Array<{
        name: string;
        value: number;
        month_num: string;
      }> = await queryRunner.manager.query(
        `
                SELECT 
                    TO_CHAR(t.created_at, 'Mon') as name, 
                    SUM(t.amount)::float as value,
                    TO_CHAR(t.created_at, 'MM') as month_num
                FROM finance.transactions t
                JOIN finance.wallets w ON t.wallet_id = w.id
                WHERE w.agent_id = $1 AND t.purpose = 'agent_commission'
                AND t.created_at >= ${fromDate}
                GROUP BY name, month_num
                ORDER BY month_num ASC
            `,
        [profile.id],
      );

      const registrationActivityRaw: Array<{
        day: string;
        count: string;
        date_val: string;
      }> = await queryRunner.manager.query(
        `
                SELECT 
                    ${range === '6m' || range === '1y' ? "TO_CHAR(d.day, 'Mon')" : "TO_CHAR(d.day, 'Dy')"} as day,
                    COUNT(u.id) + COUNT(al.id) as count,
                    d.day as date_val
                FROM (
                    SELECT generate_series(${fromDate}, NOW(), '1 day')::date as day
                ) d
                LEFT JOIN public.users u ON u.created_at::date = d.day AND u.referred_by_id = $1
                LEFT JOIN agent.listings al ON al.created_at::date = d.day AND al.agent_id = $1
                GROUP BY d.day, day
                ORDER BY d.day ASC
            `,
        [userId],
      );

      const totalEarnedRange: Array<{ total: number }> =
        await queryRunner.manager.query(
          `
                SELECT SUM(t.amount)::float as total
                FROM finance.transactions t
                JOIN finance.wallets w ON t.wallet_id = w.id
                WHERE w.agent_id = $1 AND t.purpose = 'agent_commission'
                AND t.created_at >= ${fromDate}
            `,
          [profile.id],
        );

      const agentsWithHigherEarnings = await this.profileAgentRepo.count({
        where: {
          total_earnings: MoreThan(Number(profile?.total_earnings || 0)),
        },
      });
      const agentRank = `#${agentsWithHigherEarnings + 1}`;

      const recentListings = await this.agentListingRepo.find({
        where: { agent_id: userId },
        order: { created_at: 'DESC' },
        take: 5,
      });

      return {
        total_listings: totalUsersCount + totalMandirs + totalPujaShops,
        active_listings: totalUsersCount,
        total_users: totalUsersCount,
        experts_count: astrologersCount,
        clients_count: clientsCount,
        mandirs_count: totalMandirs,
        puja_shops_count: totalPujaShops + merchantsAsPujaShopCount,
        pending_payout: withdrawalStats.pending_amount,
        total_withdrawn: withdrawalStats.total_withdrawn,
        processing_withdrawals:
          withdrawalStats.processing_amount + withdrawalStats.approved_amount,

        total_earned: Number(totalEarnedRange[0]?.total || 0),
        commission_earned: Number(totalEarnedRange[0]?.total || 0),
        expert_earnings: Number(expertEarnings.toFixed(2)),
        shop_earnings: Number(shopEarnings.toFixed(2)),
        mandir_earnings: Number(mandirEarnings.toFixed(2)),
        client_earnings: Number(clientEarnings.toFixed(2)),
        total_listings_earnings: Number(
          (expertEarnings + shopEarnings + mandirEarnings).toFixed(2),
        ),
        success_rate:
          totalUsersCount > 0
            ? ((usersWithActivity / totalUsersCount) * 100).toFixed(1) + '%'
            : '0%',
        rank: agentRank,
        revenue_growth:
          revenueGrowthRaw.length > 0
            ? revenueGrowthRaw
            : [{ name: 'No Data', value: 0 }],
        registration_activity: registrationActivityRaw.map((r) => ({
          day: r.day,
          count: Number(r.count || 0),
        })),
        commission_rates: {
          expert: expertCommPercent,
          client: clientCommPercent,
          shop: shopCommPercent,
          mandir: shopCommPercent,
        },
        recent_activity: [
          ...usersForStats.slice(0, 5).map((u) => ({
            id: u.id,
            name: u.name || 'User',
            type: 'User',
            date: u.registeredAt,
            action: 'Registration',
          })),
          ...recentListings.map((al) => ({
            id: al.id,
            name: al.name,
            type: al.type,
            date: al.created_at,
            action: 'Listing',
          })),
        ]
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, 10),
      };
    } finally {
      await queryRunner.release();
    }
  }
}
