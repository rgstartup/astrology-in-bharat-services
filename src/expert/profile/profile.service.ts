import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThanOrEqual } from 'typeorm';

import { ProfileExpert } from './entities/profile-expert.entity';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from './dto/profile-expert.dto';
import { QueryExpertDto } from './dto/query-expert.dto';
import { Address } from '@/common/entities/address.entity';
import { User } from '@/users/entities/user.entity';
import { IUser } from '@/common/guards/jwt-auth.guard';
import { ExpertGateway } from './expert.gateway';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,

    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly expertGateway: ExpertGateway,
  ) { }

  async getProfile(user: IUser) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'addresses'],
    });

    return profile; // Return null if not found instead of throwing
  }

  async createProfile(user: IUser, dto: CreateProfileExpertDto) {
    // check if exists already
    try {
      const exists = await this.profileRepo.findOne({
        where: { user: { id: user.id } },
      });
      console.log('createProfile called — user:', user);
      console.log('createProfile - dto:', dto);

      if (exists) {
        throw new BadRequestException('Expert profile already exists');
      }

      const profileData: Partial<ProfileExpert> = {
        user: { id: user.id } as any,
        // map simple scalar fields explicitly to avoid type mismatches
        gender: dto.gender,
        specialization: dto.specialization,
        bio: dto.bio,
        experience_in_years: dto.experience_in_years,
        // persist languages as CSV string to match entity column type
        languages: dto.languages ? dto.languages.join(',') : undefined,
        price: dto.price,
        bank_details: dto.bank_details,
        is_available: dto.is_available,
        addresses:
          dto.addresses?.map((addr) =>
            this.addressRepo.create({
              // map DTO -> entity fields
              line1: [addr.line1, addr.line2].filter(Boolean).join(', '),
              city: addr.city,
              state: addr.state,
              country: addr.country,
              zipCode: addr.zipCode,
            }),
          ) ?? [],
      };

      const profile = this.profileRepo.create(profileData as any);
      await this.profileRepo.save(profile);

      // Notify of status change if is_available is set
      if (dto.is_available !== undefined) {
        this.expertGateway.notifyStatusChange(user.id, dto.is_available);
      }

      return this.getProfile(user);
    } catch (error) {
      this.logger.error(`Failed to create profile for user: `, error.stack);
      throw error;
    }
  }

  async updateProfile(user: IUser, dto: UpdateProfileExpertDto) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) throw new NotFoundException('Expert profile not found');

    // Apply updates but handle `languages` (string[]) -> CSV string explicitly
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.specialization !== undefined)
      profile.specialization = dto.specialization;
    if (dto.bio !== undefined) profile.bio = dto.bio;
    if (dto.experience_in_years !== undefined)
      profile.experience_in_years = dto.experience_in_years;
    if (dto.price !== undefined) profile.price = dto.price;
    if (dto.bank_details !== undefined) profile.bank_details = dto.bank_details;
    if (dto.is_available !== undefined) profile.is_available = dto.is_available;

    if ((dto as any).languages) {
      profile.languages = (dto as any).languages.join(',');
    }

    if (dto.addresses) {
      profile.addresses = dto.addresses.map((addr: any) =>
        this.addressRepo.create({
          line1: [addr.line1, addr.line2].filter(Boolean).join(', '),
          city: addr.city,
          state: addr.state,
          country: addr.country,
          zipCode: addr.zipCode,
        }),
      );
    }

    await this.profileRepo.save(profile);

    // Notify of status change if is_available was updated
    if (dto.is_available !== undefined) {
      this.expertGateway.notifyStatusChange(user.id, dto.is_available);
    }

    return this.getProfile(user);
  }

  async updateStatus(user: IUser, isAvailable: boolean) {
    this.logger.log(`Updating status for expert ${user.id} to ${isAvailable}`);
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) {
      this.logger.warn(`Failed to update status: Profile not found for user ${user.id}`);
      throw new BadRequestException('Please complete your profile details first before going online.');
    }

    profile.is_available = isAvailable;
    await this.profileRepo.save(profile);

    // Notify of status change
    this.expertGateway.notifyStatusChange(user.id, isAvailable);

    return { is_available: isAvailable };
  }

  async listExperts(query: QueryExpertDto) {
    const limit = query.limit || 20;
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
    let queryBuilder = this.profileRepo
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
        queryBuilder = queryBuilder.andWhere(
          `(${specsConditions})`,
          specParams,
        );
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

    // Apply price filters
    if (query.minPrice !== undefined && query.maxPrice !== undefined) {
      // both bounds
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere(
          'profile.price BETWEEN :minPrice AND :maxPrice',
          {
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
          },
        );
      } else {
        queryBuilder = queryBuilder.where(
          'profile.price BETWEEN :minPrice AND :maxPrice',
          {
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
          },
        );
      }
    } else if (query.minPrice !== undefined) {
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere('profile.price >= :minPrice', {
          minPrice: query.minPrice,
        });
      } else {
        queryBuilder = queryBuilder.where('profile.price >= :minPrice', {
          minPrice: query.minPrice,
        });
      }
    } else if (query.maxPrice !== undefined) {
      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere('profile.price <= :maxPrice', {
          maxPrice: query.maxPrice,
        });
      } else {
        queryBuilder = queryBuilder.where('profile.price <= :maxPrice', {
          maxPrice: query.maxPrice,
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
        queryBuilder = queryBuilder.andWhere('addresses.city ILIKE :location', {
          location: `%${query.location}%`,
        });
      } else {
        queryBuilder = queryBuilder.where('addresses.city ILIKE :location', {
          location: `%${query.location}%`,
        });
      }
    }

    // Apply languages filter (comma-separated)
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

      if (queryBuilder.expressionMap.wheres.length > 0) {
        queryBuilder = queryBuilder.andWhere(`(${langConditions})`, langParams);
      } else {
        queryBuilder = queryBuilder.where(`(${langConditions})`, langParams);
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

    // convert stored CSV languages -> string[] for API consumers
    const mapped = experts.map((ex) => {
      const plain = { ...ex } as any;
      plain.languages = ex.languages
        ? ex.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        : [];
      plain.userId = ex.user?.id; // Add userId for socket tracking
      plain.isAvailable = ex.is_available;
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
  }

  // async fetchAllProfiles() {
  //   return this.profileRepo.find();
  // }
}
