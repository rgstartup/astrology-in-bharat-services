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
import {
  ChatSession,
  ChatSessionStatus,
} from '@/modules/chat/entities/chat-session.entity';
import { QueryExpertDto } from './dto/query-expert.dto';
import { Address } from '@/common/entities/address.entity';
import { User } from '@/modules/users/entities/user.entity';

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

    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,

    private readonly expertGateway: ExpertGateway,
  ) { }

  async getProfile(user: User) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user', 'addresses'],
    });

    if (!profile) return null;

    const plain = { ...profile } as any;
    plain.languages = profile.languages
      ? profile.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      : [];
    plain.userId = profile.user?.id;
    plain.isAvailable = profile.is_available;
    plain.is_online = profile.user?.id
      ? this.expertGateway.isExpertOnline(profile.user.id)
      : false;
    plain.total_likes = (profile as any).total_likes || 0;
    plain.custom_services = profile.custom_services || [];

    this.logger.log(
      `Returning profile for user ${user.id}: ${JSON.stringify({ ...plain, user: undefined, addresses: undefined })}`,
    );

    return plain;
  }

  async createProfile(user: User, dto: CreateProfileExpertDto) {
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
        date_of_birth: dto.date_of_birth
          ? new Date(dto.date_of_birth)
          : undefined,
        specialization: dto.specialization,
        bio: dto.bio,
        experience_in_years: dto.experience_in_years,
        // persist languages as CSV string to match entity column type
        languages: dto.languages ? dto.languages.join(',') : undefined,
        phoneNumber: dto.phoneNumber,
        price: dto.price,
        chat_price: dto.chat_price,
        call_price: dto.call_price,
        video_call_price: dto.video_call_price,
        report_price: dto.report_price,
        horoscope_price: dto.horoscope_price,
        custom_services: dto.custom_services,
        bank_details: dto.bank_details,
        is_available: dto.is_available,
        documents: dto.documents,
        gallery: dto.gallery,
        videos: dto.videos,
        video: dto.video,
        certificates: dto.certificates,
        detailed_experience: dto.detailed_experience,
        addresses:
          dto.addresses?.map((addr) =>
            this.addressRepo.create({
              // map DTO -> entity fields
              line1:
                [addr.line1, addr.line2].filter(Boolean).join(', ') ||
                addr.houseNo ||
                '',
              houseNo: addr.houseNo,
              city: addr.city,
              district: addr.district,
              state: addr.state,
              country: addr.country,
              zipCode: addr.zipCode || addr.pincode || '',
              pincode: addr.pincode,
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

  async updateProfile(user: User, dto: UpdateProfileExpertDto) {
    let profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) {
      // If profile doesn't exist (old users), create it on the fly
      profile = this.profileRepo.create({
        user: { id: user.id } as any,
        is_available: false,
      });
      await this.profileRepo.save(profile);
      profile = await this.profileRepo.findOne({
        where: { user: { id: user.id } },
      });
    }

    if (!profile)
      throw new NotFoundException('Expert profile could not be created');

    // Apply updates but handle `languages` (string[]) -> CSV string explicitly
    this.logger.log(
      `Updating profile for user ${user.id}. DTO: ${JSON.stringify(dto)}`,
    );
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.date_of_birth !== undefined) {
      this.logger.log(`Setting date_of_birth to: ${dto.date_of_birth}`);
      profile.date_of_birth = dto.date_of_birth
        ? new Date(dto.date_of_birth)
        : null;
    }
    if (dto.specialization !== undefined)
      profile.specialization = dto.specialization;
    if (dto.bio !== undefined) profile.bio = dto.bio;

    if (dto.experience_in_years !== undefined)
      profile.experience_in_years = dto.experience_in_years;

    if (dto.price !== undefined) profile.price = dto.price;
    if (dto.chat_price !== undefined) profile.chat_price = dto.chat_price;
    if (dto.call_price !== undefined) profile.call_price = dto.call_price;
    if (dto.video_call_price !== undefined)
      profile.video_call_price = dto.video_call_price;
    if (dto.report_price !== undefined) profile.report_price = dto.report_price;
    if (dto.horoscope_price !== undefined)
      profile.horoscope_price = dto.horoscope_price;
    if (dto.custom_services !== undefined)
      profile.custom_services = dto.custom_services;

    if (dto.bank_details !== undefined) profile.bank_details = dto.bank_details;
    if (dto.is_available !== undefined) {
      if (dto.is_available === false) {
        // Prevent going offline if there are active sessions
        const activeSession = await this.sessionRepo.findOne({
          where: { expertId: profile.id, status: ChatSessionStatus.ACTIVE },
        });
        if (activeSession) {
          throw new BadRequestException(
            'You cannot go offline while you have an active chat session. Please end the session first.',
          );
        }
      }
      profile.is_available = dto.is_available;
    }
    if (dto.documents !== undefined) profile.documents = dto.documents;
    if (dto.gallery !== undefined) profile.gallery = dto.gallery;
    if (dto.videos !== undefined) profile.videos = dto.videos;
    if (dto.video !== undefined) profile.video = dto.video;
    if (dto.certificates !== undefined) profile.certificates = dto.certificates;

    if (dto.detailed_experience !== undefined)
      profile.detailed_experience = dto.detailed_experience;

    if ((dto as any).languages) {
      profile.languages = (dto as any).languages.join(',');
    }

    if ((dto as any).phoneNumber !== undefined) {
      profile.phoneNumber = (dto as any).phoneNumber;
    }

    if (dto.addresses) {
      // Remove old addresses to prevent unique constraint violation
      if (profile.addresses && profile.addresses.length > 0) {
        await this.addressRepo.remove(profile.addresses);
      }

      profile.addresses = dto.addresses.map((addr: any) =>
        this.addressRepo.create({
          line1:
            [addr.line1, addr.line2].filter(Boolean).join(', ') ||
            addr.houseNo ||
            '',
          houseNo: addr.houseNo,
          city: addr.city,
          district: addr.district,
          state: addr.state,
          country: addr.country,
          zipCode: addr.zipCode || addr.pincode || '',
          pincode: addr.pincode,
          tag: addr.tag || 'other',
        }),
      );
    }

    if (dto.avatar !== undefined) {
      // update user avatar
      await this.userRepo.update(user.id, { avatar: dto.avatar });
    }

    if ((dto as any).name !== undefined) {
      // update user name
      await this.userRepo.update(user.id, { name: (dto as any).name });
    }

    if (profile) await this.profileRepo.save(profile);

    // Notify of status change if is_available was updated
    if (dto.is_available !== undefined) {
      this.expertGateway.notifyStatusChange(user.id, dto.is_available);
    }

    return this.getProfile(user);
  }

  async updateStatus(user: User, isAvailable: boolean) {
    this.logger.log(`Updating status for expert ${user.id} to ${isAvailable}`);
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) {
      this.logger.warn(
        `Failed to update status: Profile not found for user ${user.id}`,
      );
      throw new BadRequestException(
        'Please complete your profile details first before going online.',
      );
    }

    if (isAvailable === false) {
      // Prevent going offline if there are active sessions
      const activeSession = await this.sessionRepo.findOne({
        where: { expertId: profile.id, status: ChatSessionStatus.ACTIVE },
      });
      if (activeSession) {
        throw new BadRequestException(
          'You cannot go offline while you have an active chat session. Please end the session first.',
        );
      }
    }

    profile.is_available = isAvailable;
    await this.profileRepo.save(profile);

    // Notify of status change
    this.expertGateway.notifyStatusChange(user.id, isAvailable);

    return { is_available: isAvailable };
  }

  // async addDocument(user: User, documentUrl: string) {
  //   const profile = await this.profileRepo.findOne({
  //     where: { user: { id: user.id } },
  //   });

  //   if (!profile) {
  //     throw new NotFoundException('Expert profile not found');
  //   }

  //   if (!profile.documents) {
  //     profile.documents = [];
  //   }

  //   // Append new document URL
  //   // profile.documents.push(documentUrl);

  //   await this.profileRepo.save(profile);
  //   return profile;
  // }

  async listExperts(query: QueryExpertDto) {
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
      .where('1=1'); // Ensure a valid WHERE clause exists for subsequent AND conditions

    // Filter: Service Availability (ensure price > 0 for selected service)
    if (
      query.service &&
      ['chat', 'call', 'video_call'].includes(query.service)
    ) {
      queryBuilder.andWhere(`${priceColumn} > 0`);
    }

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
      queryBuilder.orderBy('profile.createdAt', 'DESC');
    }
    // 'none' falls through without processing

    try {
      // Apply pagination
      const [experts, total] = await queryBuilder
        .skip(offset)
        .take(limit)
        .getManyAndCount();

      // Map response
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
        plain.is_online = ex.user?.id
          ? this.expertGateway.isExpertOnline(ex.user.id)
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
      throw new BadRequestException('Failed to load experts');
    }
  }

  async getExpertById(id: number) {
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.addresses', 'addresses')
      .where('profile.id = :id', { id });

    const expert = await queryBuilder.getOne();

    if (!expert) {
      throw new NotFoundException('Expert profile not found');
    }

    // convert stored CSV languages -> string[] for API consumers
    const plain = { ...expert } as any;
    plain.languages = expert.languages
      ? expert.languages
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      : [];
    plain.userId = expert.user?.id;
    plain.isAvailable = expert.is_available;
    plain.is_online = expert.user?.id
      ? this.expertGateway.isExpertOnline(expert.user.id)
      : false;
    plain.total_likes = (expert as any).total_likes || 0;
    plain.custom_services = expert.custom_services || [];

    return plain;
  }
}
