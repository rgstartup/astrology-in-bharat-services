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
  ) { }

  async execute(id: number) {
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.addresses', 'addresses')
      .where('profile.id = :id', { id })
      .andWhere("LOWER(profile.kyc_status) IN ('approved', 'active')");

    const expert = await queryBuilder.getOne();
    console.log(`[GetExpertByIdUseCase] ID: ${id}, Expert found: ${!!expert}, Status matches: ${!!expert && ['approved', 'active'].includes(expert.kyc_status?.toLowerCase())}`);
    
    if (!expert) {
      throw new NotFoundException('Expert profile not found');
    }

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
