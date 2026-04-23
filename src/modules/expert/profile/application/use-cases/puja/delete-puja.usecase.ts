import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/persistence/entities/expert-puja.entity';
import { ProfileExpert } from '../../../infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class DeletePujaUseCase {
  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepo: Repository<ExpertPuja>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) { }

  async execute(userId: string, id: number) {
    const profile = await this.profileRepo.findOne({
      where: { better_auth_user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('Expert profile not found');
    }

    const puja = await this.pujaRepo.findOne({
      where: { id, expert_id: profile.id },
    });

    if (!puja) {
      throw new NotFoundException('Puja service not found');
    }

    await this.pujaRepo.remove(puja);
    return { success: true };
  }
}
