import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { RoleEnum } from '@/modules/users/enums/Role.enum';
import { IFindProfileStrategy } from './find-profile.strategy';

@Injectable()
export class ExpertFindProfileStrategy implements IFindProfileStrategy {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  supports(role: RoleEnum): boolean {
    return role === RoleEnum.EXPERT;
  }

  async findProfile(userId: number): Promise<number | null> {
    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
      select: ['id'],
    });
    return profile?.id ?? null;
  }
}
