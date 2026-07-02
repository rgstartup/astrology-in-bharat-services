import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/entities/expert-puja.entity';
import { ProfileExpert } from '../../../infrastructure/entities/profile-expert.entity';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class DeletePujaUseCase {
  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepo: Repository<ExpertPuja>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  async execute(user: IUser, id: string) {
    const where = user.profile
      ? { id: user.profile, user: { id: user.id } }
      : { user: { id: user.id } };
    const profile = await this.profileRepo.findOne({ where });

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
