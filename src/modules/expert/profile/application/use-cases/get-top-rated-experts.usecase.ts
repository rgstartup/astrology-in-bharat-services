import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { ExpertGateway } from '../../api/gateways/expert.gateway';

@Injectable()
export class GetTopRatedExpertsUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly expertGateway: ExpertGateway,
  ) { }

  async execute(limit: number = 3) {
    const queryBuilder = this.profileRepo
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .leftJoinAndSelect('profile.addresses', 'addresses')
      .where("LOWER(profile.kyc_status) IN ('approved', 'active')")
      .orderBy('profile.rating', 'DESC')
      .take(limit);

    const experts = await queryBuilder.getMany();

    return experts.map((ex) => {
      const plain = { ...ex } as any;
      plain.languages = ex.languages
        ? ex.languages
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
        : [];
      plain.userId = ex.user?.id;
      plain.isAvailable = ex.is_available;
      plain.is_online = ex.user?.id
        ? this.expertGateway.isExpertOnline(ex.user.id as any)
        : false;
      return plain;
    });
  }
}
