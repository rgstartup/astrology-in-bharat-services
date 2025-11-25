import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThanOrEqual } from 'typeorm';
import { ProfileExpert } from './profile/entities/profile-expert.entity';
import { User } from '@/users/entities/user.entity';
import { QueryExpertDto } from './profile/dto/query-expert.dto';

@Injectable()
export class ExpertsService {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileExpertRepo: Repository<ProfileExpert>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listExperts(query: QueryExpertDto) {
    const limit = query.limit || 30;
    const offset = query.offset || 0;
    const sort = query.sort || 'newest';

    // Build WHERE conditions
    const whereConditions: any[] = [];

    // Search by expert name
    if (query.q && query.q.trim()) {
      whereConditions.push({
        user: {
          name: ILike(`%${query.q}%`),
        },
      });
    }

    // Filter by specialization (comma-separated)
    if (query.specializations && query.specializations.trim()) {
      const specs = query.specializations
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // Match if specialization contains any of these keywords
      whereConditions.push(
        ...specs.map((spec) => ({
          specialization: ILike(`%${spec}%`),
        })),
      );
    }

    // Filter by minimum rating
    if (query.minRating && query.minRating > 0) {
      whereConditions.push({
        rating: MoreThanOrEqual(query.minRating),
      });
    }

    // Filter by minimum experience
    if (query.minExperience && query.minExperience >= 0) {
      whereConditions.push({
        experience_in_years: MoreThanOrEqual(query.minExperience),
      });
    }

    // Build order by
    let orderBy: any = { createdAt: 'DESC' }; // default: newest
    if (sort === 'experience') {
      orderBy = { experience_in_years: 'DESC' };
    } else if (sort === 'rating') {
      orderBy = { rating: 'DESC' };
    } else if (sort === 'name') {
      orderBy = { user: { name: 'ASC' } };
    } else if (sort === 'newest') {
      orderBy = { createdAt: 'DESC' };
    }

    // Query experts with relations
    let queryBuilder = this.profileExpertRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.addresses', 'addresses');

    // Apply search by name
    if (query.q && query.q.trim()) {
      queryBuilder = queryBuilder.where('user.name ILIKE :name', {
        name: `%${query.q}%`,
      });
    }

    // Apply specialization filter
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

      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere(`(${specsConditions})`, specParams);
      } else {
        queryBuilder = queryBuilder.where(`(${specsConditions})`, specParams);
      }
    }

    // Apply rating filter
    if (query.minRating && query.minRating > 0) {
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere('profile.rating >= :minRating', {
          minRating: query.minRating,
        });
      } else {
        queryBuilder = queryBuilder.where('profile.rating >= :minRating', {
          minRating: query.minRating,
        });
      }
    }

    // Apply experience filter
    if (query.minExperience && query.minExperience >= 0) {
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere(
          'profile.experience_in_years >= :minExperience',
          {
            minExperience: query.minExperience,
          },
        );
      } else {
        queryBuilder = queryBuilder.where(
          'profile.experience_in_years >= :minExperience',
          {
            minExperience: query.minExperience,
          },
        );
      }
    }

    // Apply location filter (search in addresses.city)
    if (query.location && query.location.trim()) {
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere(
          'addresses.city ILIKE :location',
          {
            location: `%${query.location}%`,
          },
        );
      } else {
        queryBuilder = queryBuilder.where('addresses.city ILIKE :location', {
          location: `%${query.location}%`,
        });
      }
    }

    // Apply sorting
    if (sort === 'experience') {
      queryBuilder = queryBuilder.orderBy(
        'profile.experience_in_years',
        'DESC',
      );
    } else if (sort === 'rating') {
      queryBuilder = queryBuilder.orderBy('profile.rating', 'DESC');
    } else if (sort === 'name') {
      queryBuilder = queryBuilder.orderBy('user.name', 'ASC');
    } else {
      // default: newest
      queryBuilder = queryBuilder.orderBy('profile.createdAt', 'DESC');
    }

    // Apply pagination
    const [experts, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      data: experts,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    };
  }
}
