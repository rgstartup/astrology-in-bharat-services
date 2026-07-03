import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../infrastructure/entities/user.entity';
import { ProfileClient } from '@/modules/client/profile/infrastructure/entities/profile-client.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

import { Address } from '@/common/address/address.entity';

@Injectable()
export class FindUsersByRoleUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(
    role: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndMapOne(
        'user.profile_client',
        ProfileClient,
        'profile_client',
        'profile_client.user_id = user.id',
      )
      .leftJoinAndMapOne(
        'user.profile_expert',
        ProfileExpert,
        'profile_expert',
        'profile_expert.user_id = user.id',
      )
      .leftJoinAndMapMany(
        'user.addresses',
        Address,
        'addresses',
        'addresses.profile_expert_id = profile_expert.id OR addresses.profile_client_id = profile_client.id',
      )
      .where(':roleName = ANY(user.roles)', { roleName: role });

    if (search) {
      query.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (role === 'expert') {
      if (status && status !== 'all' && status !== '') {
        query.andWhere('profile_expert.kyc_status = :status', { status });
      }

      // Use raw subqueries to avoid TypeORM subquery builder bugs
      query.addSelect(
        "(SELECT COUNT(*) FROM consultations.chat_sessions chat WHERE chat.expert_id = profile_expert.id AND chat.status = 'completed')",
        'chat_consultations',
      );
      query.addSelect(
        "(SELECT COUNT(*) FROM consultations.call_sessions call WHERE call.expert_id = profile_expert.id AND call.status = 'completed')",
        'call_consultations',
      );
    }

    const rawAndEntities = await query
      .orderBy('user.id', 'DESC')
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getRawAndEntities();

    // Step 1: merge consultation counts from raw query
    const items = rawAndEntities.entities.map((userObj, index) => {
      const user = userObj as User & { profile_expert?: Record<string, unknown> };
      const raw = rawAndEntities.raw[index] as Record<string, unknown>;
      if (user.profile_expert) {
        user.profile_expert.consultation_count =
          parseInt((raw.chat_consultations as string) || '0') +
          parseInt((raw.call_consultations as string) || '0');
      }
      return user;
    });

    // Step 2: flatten profile_expert fields to root level
    // so frontend can access expert.gender, expert.date_of_birth etc. directly
    const flattenedItems = items.map((userObj) => {
      const user = userObj as any;
      const pe = user.profile_expert;
      if (!pe) return user;

      return {
        ...user,
        gender: user.gender || pe.gender,
        date_of_birth: user.date_of_birth || pe.date_of_birth,
        phone_number: user.phone_number || pe.phone_number,
        bio: user.bio || pe.bio,
        specialization: user.specialization || pe.specialization,
        experience_in_years: user.experience_in_years ?? pe.experience_in_years,
        rating: user.rating ?? pe.rating,
        consultation_count: user.consultation_count ?? pe.consultation_count,
        kyc_status: user.kyc_status || pe.kyc_status,
        rejection_reason: user.rejection_reason ?? pe.rejection_reason,
        languages: user.languages || (pe.languages
          ? pe.languages.split(',').map((l: string) => l.trim()).join(', ')
          : ''),
        addresses: user.addresses?.map((addr: any) => ({
          house_no: addr.house_no || '',
          line1: addr.line1 || addr.house_no || '',
          district: addr.district || '',
          city: addr.city || addr.district || '',
          state: addr.state || '',
          country: addr.country || '',
          pincode: addr.pincode || addr.zip_code || '',
        })) || pe?.addresses || [],
        gallery: user.gallery || pe.gallery || [],
        documents: user.documents || pe.documents || [],
        certificates: user.certificates || pe.certificates || [],
        intro_video_url: user.intro_video_url || pe.video || (pe.videos?.length > 0 ? pe.videos[0] : ''),
        profile_expert: pe, // keep nested for backward compat
      };
    });

    const total = await query.getCount();

    return {
      items: flattenedItems,
      total,
      page: Number(page),
      lastPage: Math.ceil(total / Number(limit)),
    };
  }
}
