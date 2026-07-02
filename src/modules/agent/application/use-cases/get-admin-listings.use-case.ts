import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentListing } from '@/modules/agent/infrastructure/entities/agent-listing.entity';

import { UsersFacade } from '@/modules/users/application/users.facade';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { MerchantProfileFacade } from '@/modules/merchant/profile/application/profile.facade';

@Injectable()
export class GetAdminListingsUseCase {
  constructor(
    @InjectRepository(AgentListing)
    private readonly listingRepository: Repository<AgentListing>,
    private readonly usersFacade: UsersFacade,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private readonly expertFacade: ExpertProfileFacade,
    @Inject(forwardRef(() => MerchantProfileFacade))
    private readonly merchantFacade: MerchantProfileFacade,
  ) {}

  async execute(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const skip = (page - 1) * limit;

    const isPlaceType =
      params?.type === 'mandir' || params?.type === 'puja_shop';
    const isExpertType =
      params?.type === 'expert' || params?.type === 'astrologer';
    const isAll = !params?.type || params?.type === 'all';

    let placeData: AgentListing[] = [];
    let expertData: Array<{
      id: string;
      name?: string;
      roles?: string[];
      referred_by?: { uid?: string; name?: string };
      referred_by_id?: string;
      created_at: Date;
      profile_expert?: Record<string, unknown> | null;
      profile_merchant?: Record<string, unknown> | null;
    }> = [];

    // 1. Fetch Agent Listings (Mandir/Shop)
    if (isPlaceType || isAll) {
      const qb = this.listingRepository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.agent', 'agent');

      if (isPlaceType) {
        qb.andWhere('listing.type = :type', { type: params?.type });
      }

      if (params?.search) {
        qb.andWhere(
          '(LOWER(listing.name) LIKE :search OR LOWER(listing.location) LIKE :search OR LOWER(agent.name) LIKE :search)',
          { search: `%${params.search.toLowerCase()}%` },
        );
      }
      placeData = await qb.getMany();
    }

    // 2. Fetch Referred Users (Experts and Merchants/Puja Shops)
    if (isExpertType || isPlaceType || isAll) {
      const roleFilters: string[] = [];

      if (isExpertType) {
        roleFilters.push('expert');
      } else if (isPlaceType && params?.type === 'puja_shop') {
        roleFilters.push('merchant');
      } else if (isAll) {
        roleFilters.push('expert', 'merchant');
      }

      const users = await this.usersFacade.findReferredUsers(
        roleFilters,
        params?.search,
      );

      // Fetch their profiles
      expertData = await Promise.all(
        users.map(async (uObj) => {
          let expertProfile: Record<string, unknown> | null = null;
          let merchantProfile: Record<string, unknown> | null = null;

          if ((uObj.roles as string[])?.includes('expert')) {
            expertProfile = (await this.expertFacade.getExpertByUserId(
              uObj.id,
            )) as Record<string, unknown> | null;
          }
          if ((uObj.roles as string[])?.includes('merchant')) {
            merchantProfile = (await this.merchantFacade.getProfileByUserId(
              uObj.id,
            )) as Record<string, unknown> | null;
          }

          return {
            id: uObj.id,
            name: uObj.name || undefined,
            roles: uObj.roles,
            referred_by: uObj.referred_by as unknown as {
              uid?: string;
              name?: string;
            },
            referred_by_id: uObj.referred_by_id || undefined,
            created_at: uObj.created_at,
            profile_expert: expertProfile,
            profile_merchant: merchantProfile,
          };
        }),
      );
    }

    // 3. Map to unified format
    const mappedPlaces = placeData.map((l) => ({
      id: `listing-${l.id}`,
      listing_type: l.type,
      listing_name: l.name,
      listing_location: l.location,
      status: l.status,
      name: l.name,
      location: l.location,
      phone: l.phone,
      agent_id:
        (l.agent as unknown as { uid?: string })?.uid || l.agent_id?.toString(),
      agent_name: l.agent?.name || 'Unknown',
      created_at: l.created_at,
    }));

    const mappedExperts = expertData.map((u) => {
      const roles = u.roles || [];
      const isExpert = roles.includes('expert');
      const isMerchant = roles.includes('merchant');

      return {
        id: `expert-${u.id}`,
        listing_type: isExpert
          ? 'expert'
          : isMerchant
            ? 'puja_shop'
            : 'unknown',
        listing_name: u.name,
        listing_location: isExpert
          ? u.profile_expert?.city || '—'
          : u.profile_merchant?.shop_address || '—',
        status: 'active',
        name: u.name,
        location: isExpert
          ? u.profile_expert?.city || '—'
          : u.profile_merchant?.shop_address || '—',
        phone:
          u.profile_expert?.phone_number || u.profile_merchant?.phone || '—',
        agent_id: u.referred_by?.uid || u.referred_by_id?.toString(),
        agent_name: u.referred_by?.name || 'Unknown',
        created_at: u.created_at,
      };
    });

    // 4. Combine and Sort
    const allData = [...mappedPlaces, ...mappedExperts].sort((a, b) => {
      const dateComparison =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dateComparison !== 0) return dateComparison;
      return String(b.id).localeCompare(String(a.id));
    });

    // 5. Calculate Stats for the Entire Set (before slicing)
    const stats = {
      total: allData.length,
      experts: allData.filter((d) => d.listing_type === 'expert').length,
      mandirs: allData.filter((d) => d.listing_type === 'mandir').length,
      puja_shops: allData.filter((d) => d.listing_type === 'puja_shop').length,
    };

    const paginatedData = allData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      total: allData.length,
      page,
      limit,
      stats, // Include high-level stats for frontend cards
    };
  }
}
