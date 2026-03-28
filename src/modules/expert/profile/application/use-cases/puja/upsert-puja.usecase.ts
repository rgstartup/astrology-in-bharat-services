import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpertPuja } from '../../../infrastructure/persistence/entities/expert-puja.entity';
import { ProfileExpert } from '../../../infrastructure/persistence/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ExpertPujaDto } from '../../../api/dto/expert-puja.dto';
import { GetProfileUseCase } from '../get-profile.usecase';

@Injectable()
export class UpsertPujaUseCase {
  private readonly logger = new Logger(UpsertPujaUseCase.name);

  constructor(
    @InjectRepository(ExpertPuja)
    private readonly pujaRepo: Repository<ExpertPuja>,
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) { }

  async execute(user: User, dto: ExpertPujaDto, id?: number) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    if (!profile) {
      throw new NotFoundException('Expert profile not found');
    }

    let puja: ExpertPuja;

    if (id) {
      const existing = await this.pujaRepo.findOne({
        where: { id, expert_id: profile.id },
      });
      if (!existing) {
        throw new NotFoundException('Puja service not found');
      }
      puja = existing;
    } else {
      puja = this.pujaRepo.create({
        expert_id: profile.id,
      });
    }

    puja.type = dto.type;
    puja.name = dto.name;
    puja.duration_hours = dto.duration_hours;
    puja.cost = dto.cost;
    puja.description = dto.description ?? null;
    puja.districts = dto.type === 'home_visit' ? (dto.districts ?? []) : null;
    puja.samagri_list = dto.samagri_list ?? [];

    await this.pujaRepo.save(puja);

    return this.getProfileUseCase.execute(user);
  }
}
