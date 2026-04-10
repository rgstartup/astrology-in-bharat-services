import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentListing } from '@/modules/agent/infrastructure/persistence/entities/agent-listing.entity';

import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Injectable()
export class GetAdminListingsUseCase {
  constructor(
    @InjectRepository(AgentListing)
    private readonly listingRepository: Repository<AgentListing>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { } 

  async execute(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Number(params?.page) || 1;
    const limit = Number(params?.limit) || 10;
    const skip = (page - 1) * limit;

    const isPlaceType = params?.type === 'mandir' || params?.type === 'puja_shop';
    const isExpertType = params?.type === 'expert' || params?.type === 'astrologer';
    const isAll = !params?.type || params?.type === 'all';

    let placeData: any[] = [];
    let expertData: any[] = [];

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
      const qb = this.userRepository.createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .leftJoinAndSelect('user.referred_by', 'agent')
        .leftJoinAndSelect('user.profile_expert', 'pe')
        .leftJoinAndSelect('user.profile_merchant', 'pm')
        .where('user.referred_by_id IS NOT NULL');

      if (isExpertType) {
        qb.andWhere('role.name = :roleName', { roleName: 'expert' });
      } else if (isPlaceType && params?.type === 'puja_shop') {
        // Find users who are merchants and referred by an agent
        qb.andWhere('role.name = :roleName', { roleName: 'merchant' });
      } else if (isAll) {
        qb.andWhere('role.name IN (:...roleNames)', { roleNames: ['expert', 'merchant'] });
      }

      if (params?.search) {
        qb.andWhere(
          '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search OR LOWER(agent.name) LIKE :search)',
          { search: `%${params.search.toLowerCase()}%` },
        );
      }
      expertData = await qb.getMany();
    }

    // 3. Map to unified format
    const mappedPlaces = placeData.map(l => ({
      id: `listing-${l.id}`,
      listing_type: l.type,
      listing_name: l.name,
      listing_location: l.location,
      status: l.status,
      name: l.name,
      location: l.location,
      phone: l.phone,
      agent_id: l.agent?.uid || l.agent_id?.toString(),
      agent_name: l.agent?.name || 'Unknown',
      created_at: l.created_at,
    }));

    const mappedExperts = expertData.map(u => {
      const roles = (u.roles || []).map(r => r.name.toLowerCase());
      const isExpert = roles.includes('expert');
      const isMerchant = roles.includes('merchant');

      return {
        id: `expert-${u.id}`,
        listing_type: isExpert ? 'expert' : isMerchant ? 'puja_shop' : 'unknown',
        listing_name: u.name,
        listing_location: isExpert ? (u.profile_expert?.city || '—') : (u.profile_merchant?.shop_address || '—'),
        status: 'active',
        name: u.name,
        location: isExpert ? (u.profile_expert?.city || '—') : (u.profile_merchant?.shop_address || '—'),
        phone: u.profile_expert?.phone_number || u.profile_merchant?.phone || '—',
        agent_id: u.referred_by?.uid || u.referred_by_id?.toString(),
        agent_name: u.referred_by?.name || 'Unknown',
        created_at: u.created_at,
      };
    });

    // 4. Combine and Sort
    const allData = [...mappedPlaces, ...mappedExperts].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 5. Calculate Stats for the Entire Set (before slicing)
    const stats = {
      total: allData.length,
      experts: allData.filter(d => d.listing_type === 'expert').length,
      mandirs: allData.filter(d => d.listing_type === 'mandir').length,
      puja_shops: allData.filter(d => d.listing_type === 'puja_shop').length,
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
