import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class GetExpertByIdUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly expertGateway: ExpertGateway,
  ) {}

  async execute(id: string) {
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.addresses', 'addresses')
      .where('profile.id = :id', { id })
      .andWhere("LOWER(profile.kyc_status) IN ('approved', 'active')");

    const expert = await queryBuilder.getOne();
    console.log(
      `[GetExpertByIdUseCase] ID: ${id}, Expert found: ${!!expert}, Status matches: ${!!expert && ['approved', 'active'].includes(expert.kyc_status?.toLowerCase())}`,
    );

    if (!expert) {
      throw new NotFoundException('Expert profile not found');
    }

    const plain = { ...expert } as unknown as Record<string, unknown>;
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

    // Standard fallbacks (COALESCE logic shifted to backend)
    plain.price = expert.price || 0;
    plain.video = expert.video || 'https://www.youtube.com/embed/INoPh_oRooU';
    plain.rating = expert.rating !== undefined ? Math.round(expert.rating) : 5;
    plain.ratings = plain.rating; // align both rating and ratings
    plain.bio = expert.bio || '';
    plain.about = expert.about || '';
    plain.detailed_experience = expert.detailed_experience || [];
    plain.gallery = expert.gallery || [];
    plain.videos = expert.videos || [];
    plain.total_likes = expert.total_likes || 0;
    plain.is_available = expert.is_available ?? false;
    plain.custom_services = expert.custom_services || [];

    return plain;
  }
}
