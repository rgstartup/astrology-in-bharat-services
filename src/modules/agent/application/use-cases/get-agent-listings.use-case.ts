import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/core/database/database.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProfileAgent } from '../../infrastructure/entities/profile-agent.entity';
import { AgentListing } from '../../infrastructure/entities/agent-listing.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { SystemSetting } from '@/modules/admin/infrastructure/entities/system-setting.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileMerchant } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class GetAgentListingsUseCase {
  constructor(
    private readonly databaseService: DatabaseService,
    @InjectRepository(ProfileAgent)
    private readonly profileAgentRepo: Repository<ProfileAgent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AgentListing)
    private readonly agentListingRepo: Repository<AgentListing>,
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepo: Repository<SystemSetting>,
  ) {}

  async execute(
    user: IUser,
    pagination: PaginationDto,
    type?: string,
    search?: string,
  ) {
    const userId = user.id;
    const queryRunner = this.databaseService.getQueryRunner();
    await queryRunner.connect();

    try {
      const isPlaceType =
        type === 'mandir' || type === 'puja_shop' || type === 'merchant';
      const isUserType =
        type === 'astrologer' ||
        type === 'expert' ||
        type === 'client' ||
        type === 'merchant' ||
        type === 'puja_shop';
      const isAll = !type || type === 'all';

      let userData: Record<string, unknown>[] = [];
      let userTotal = 0;
      let placeData: Record<string, unknown>[] = [];
      let placeTotal = 0;

      const agentProfileWhere = user.profile
        ? { id: user.profile, user_id: userId }
        : { user_id: userId };
      const agentProfile = await this.profileAgentRepo.findOne({
        where: agentProfileWhere,
      });

      const registeredUserIds = agentProfile?.registered_user_ids || [];
      const registeredAstrologerIds =
        agentProfile?.registered_astrologer_ids || [];
      const allRegisteredIds = [
        ...registeredUserIds,
        ...registeredAstrologerIds,
      ];

      if (isUserType || isAll) {
        const qb = this.userRepo
          .createQueryBuilder('u')
          .leftJoinAndMapOne(
            'u.profile_expert',
            ProfileExpert,
            'pe',
            'pe.user_id = u.id',
          )
          .leftJoinAndMapOne(
            'u.profile_client',
            ProfileClient,
            'pc',
            'pc.user_id = u.id',
          )
          .leftJoinAndMapOne(
            'u.profile_merchant',
            ProfileMerchant,
            'pm',
            'pm.user_id = u.id',
          )
          .where('u.referred_by_id = :agentId', { agentId: userId });

        if (allRegisteredIds.length > 0) {
          qb.orWhere('u.id IN (:...ids)', { ids: allRegisteredIds });
        }

        if (type === 'astrologer' || type === 'expert') {
          qb.andWhere(':role = ANY(u.roles)', { role: RoleEnum.EXPERT });
        } else if (type === 'client') {
          qb.andWhere(':role = ANY(u.roles)', { role: RoleEnum.CLIENT });
        } else if (type === 'puja_shop' || type === 'merchant') {
          qb.andWhere(':role = ANY(u.roles)', { role: RoleEnum.MERCHANT });
        }

        if (search && search.trim()) {
          qb.andWhere(
            '(LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search)',
            { search: `%${search.trim().toLowerCase()}%` },
          );
        }

        qb.orderBy('u.created_at', 'DESC');

        if (!isAll) {
          qb.skip(pagination.offset).take(pagination.limit);
        }

        const [users, total] = await qb.getManyAndCount();
        userTotal = total;

        const _settings = await this.systemSettingRepo.find({
          where: {
            key: In([
              'COMMISSION_FROM_CLIENT',
              'COMMISSION_FROM_ASTROLOGER',
              'COMMISSION_FROM_PUJA_SHOP',
            ]),
          },
        });

        const actualStats: Array<{
          expert_id: string;
          total_gross: number;
          total_commission: number;
        }> = await queryRunner.manager.query(
          `
                    SELECT 
                        expert_id, 
                        SUM(total_cost)::float as total_gross, 
                        SUM(agent_commission)::float as total_commission
                    FROM (
                        SELECT expert_id, total_cost, agent_commission FROM consultations.chat_sessions WHERE agent_id = $1
                        UNION ALL
                        SELECT expert_id, total_cost, agent_commission FROM consultations.call_sessions WHERE agent_id = $1
                    ) as s
                    GROUP BY expert_id
                `,
          [userId],
        );

        userData = users.map((uObj) => {
          const u = uObj as User & {
            profile_expert?: {
              id?: string;
              phone_number?: string;
              agent_commission_rate?: number;
              total_earning?: number;
            };
            profile_merchant?: {
              phone?: string;
              agent_commission_rate?: number;
              total_sales?: number;
            };
            profile_client?: { phone?: string; total_spending?: number };
            roles?: string[];
          };
          const roles = u.roles || [];
          const isExpert = roles.includes(RoleEnum.EXPERT);
          const isMerchant = roles.includes(RoleEnum.MERCHANT);

          let commission = 0;
          let totalRevenue = 0;
          let individualCommPercent = 3;

          if (isExpert && u.profile_expert) {
            individualCommPercent = u.profile_expert.agent_commission_rate || 0;
            const stats = actualStats.find(
              (s) => s.expert_id === u.profile_expert?.id,
            );
            commission = stats ? stats.total_commission : 0;
            totalRevenue = stats ? stats.total_gross : 0;
          } else if (isMerchant && u.profile_merchant) {
            individualCommPercent =
              u.profile_merchant.agent_commission_rate || 0;
            commission =
              (Number(u.profile_merchant.total_sales || 0) *
                individualCommPercent) /
              100;
            totalRevenue = Number(u.profile_merchant.total_sales || 0);
          } else if (u.profile_client) {
            individualCommPercent = 0;
            commission =
              (Number(u.profile_client.total_spending || 0) *
                individualCommPercent) /
              100;
            totalRevenue = Number(u.profile_client.total_spending || 0);
          }

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            phone:
              u.profile_client?.phone ||
              u.profile_expert?.phone_number ||
              u.profile_merchant?.phone ||
              null,
            status: 'active',
            type: isExpert ? 'expert' : isMerchant ? 'merchant' : 'client',
            created_at: u.created_at,
            avatar: u.avatar ?? null,
            total_spending: u.profile_client?.total_spending || 0,
            total_earning: u.profile_expert?.total_earning || 0,
            total_revenue: Number(totalRevenue.toFixed(2)),
            commission: Number(commission.toFixed(2)),
            commission_percent: individualCommPercent,
          };
        });
      }

      if (isPlaceType || isAll) {
        const qb = this.agentListingRepo
          .createQueryBuilder('al')
          .where('al.agent_id = :agentId', { agentId: userId });

        if (isPlaceType) {
          qb.andWhere('al.type = :type', { type });
        }

        if (search && search.trim()) {
          qb.andWhere(
            '(LOWER(al.name) LIKE :search OR LOWER(al.location) LIKE :search)',
            { search: `%${search.trim().toLowerCase()}%` },
          );
        }

        qb.orderBy('al.created_at', 'DESC');

        if (!isAll) {
          qb.skip(pagination.offset).take(pagination.limit);
        }

        const [places, total] = await qb.getManyAndCount();
        placeTotal = total;
        placeData = places.map((p) => ({
          id: `listing-${p.id}`,
          name: p.name,
          email: null,
          phone: p.phone,
          status: p.status,
          type: p.type,
          location: p.location,
          deity: p.deity,
          items: p.items,
          created_at: p.created_at,
          avatar: null,
        }));
      }

      const allData = [...userData, ...placeData].sort((a, b) => {
        const dateA = new Date(
          a.created_at as string | number | Date,
        ).getTime();
        const dateB = new Date(
          b.created_at as string | number | Date,
        ).getTime();
        return dateB - dateA;
      });
      const allTotal = userTotal + placeTotal;

      if (isAll) {
        const start = pagination.offset;
        return {
          data: allData.slice(start, start + pagination.limit),
          total: allTotal,
          page: pagination.page,
          limit: pagination.limit,
        };
      }

      return {
        data: isPlaceType ? placeData : userData,
        total: isPlaceType ? placeTotal : userTotal,
        page: pagination.page,
        limit: pagination.limit,
      };
    } finally {
      await queryRunner.release();
    }
  }
}
