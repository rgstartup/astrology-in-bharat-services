import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';
import { QueryExpertDto } from '../../api/dto/query-expert.dto';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class ListExpertsUseCase {
  private readonly logger = new Logger(ListExpertsUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly expertGateway: ExpertGateway,
  ) { }

  async execute(query: QueryExpertDto) {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const sort = query.sort || 'newest';

    // Determine relevant price column based on service filter
    let priceColumn = 'profile.price';
    if (query.service === 'chat') {
      priceColumn = 'profile.chat_price';
    } else if (query.service === 'call') {
      priceColumn = 'profile.call_price';
    } else if (query.service === 'video_call') {
      priceColumn = 'profile.video_call_price';
    }

    // Initialize query builder
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.addresses', 'addresses')
      .where('LOWER(profile.kyc_status) IN (:...statuses)', {
        statuses: ['approved', 'active'],
      });

    // Filter: Search by expert name
    if (query.q && query.q.trim()) {
      queryBuilder.andWhere('user.name ILIKE :name', {
        name: `%${query.q}%`,
      });
    }

    // Filter: Specializations
    if (query.specializations && query.specializations.trim()) {
      const specs = query.specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const specsConditions = specs
        .map((_, idx) => `profile.specialization ILIKE :spec${idx}`)
        .join(' OR ');

      const specParams: any = {};
      specs.forEach((spec, idx) => {
        specParams[`spec${idx}`] = `%${spec}%`;
      });

      queryBuilder.andWhere(`(${specsConditions})`, specParams);
    }

    // Filter: Rating (handle both rating and minRating)
    const rawRating = query.rating || query.minRating;
    const minRating = rawRating ? Number(rawRating) : undefined;
    if (minRating && minRating > 0) {
      queryBuilder.andWhere('profile.rating >= :minRating', {
        minRating: minRating,
      });
    }

    // Filter: Price Range (uses the relevant price column)
    if (query.minPrice !== undefined) {
      queryBuilder.andWhere(`${priceColumn} >= :minPrice`, {
        minPrice: Number(query.minPrice),
      });
    }
    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere(`${priceColumn} <= :maxPrice`, {
        maxPrice: Number(query.maxPrice),
      });
    }

    // Filter: Experience
    if (query.minExperience && query.minExperience >= 0) {
      queryBuilder.andWhere('profile.experience_in_years >= :minExperience', {
        minExperience: Number(query.minExperience),
      });
    }

    // Filter: Location (city)
    if (query.location && query.location.trim()) {
      queryBuilder.andWhere('addresses.city ILIKE :location', {
        location: `%${query.location}%`,
      });
    }

    // Filter: State
    if (query.state && query.state.trim()) {
      queryBuilder.andWhere('addresses.state ILIKE :state', {
        state: `%${query.state}%`,
      });
    }

    // Filter: Online Status (handle online=true or onlineOnly=true)
    const isOnlineFilter =
      query.online === 'true' || query.onlineOnly === 'true';
    if (isOnlineFilter) {
      queryBuilder.andWhere('profile.is_available = :isAvailable', {
        isAvailable: true,
      });
    }

    // Filter: Languages
    if (query.languages && query.languages.trim()) {
      const langs = query.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const langConditions = langs
        .map((_, idx) => `profile.languages ILIKE :lang${idx}`)
        .join(' OR ');

      const langParams: any = {};
      langs.forEach((lang, idx) => {
        langParams[`lang${idx}`] = `%${lang}%`;
      });

      queryBuilder.andWhere(`(${langConditions})`, langParams);
    }

    // Sorting
    if (sort === 'experience') {
      queryBuilder.orderBy('profile.experience_in_years', 'DESC');
    } else if (sort === 'rating') {
      queryBuilder.orderBy('profile.rating', 'DESC');
    } else if (sort === 'name') {
      queryBuilder.orderBy('user.name', 'ASC');
    } else if (sort === 'price_asc') {
      queryBuilder.orderBy(priceColumn, 'ASC');
    } else if (sort === 'price_desc') {
      queryBuilder.orderBy(priceColumn, 'DESC');
    } else if (sort === 'newest') {
      queryBuilder.orderBy('profile.created_at', 'DESC');
    }

    try {
      const [experts, total] = await queryBuilder
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      const mapped = experts.map((ex) => {
        const plain = { ...ex } as any;
        plain.languages = ex.languages
          ? ex.languages
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          : [];
        plain.userId = ex.user?.id;
        plain.isAvailable = ex.is_available;
        plain.is_online = ex.better_auth_user_id
          ? this.expertGateway.isExpertOnline(ex.better_auth_user_id)
          : false;
        plain.total_likes = (ex as any).total_likes || 0;
        plain.custom_services = ex.custom_services || [];
        return plain;
      });

      return {
        data: mapped,
        pagination: {
          limit,
          offset,
          total,
          hasMore: offset + limit < total,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to list experts: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Failed to load experts: ${error.message}`);
    }
  }
}
