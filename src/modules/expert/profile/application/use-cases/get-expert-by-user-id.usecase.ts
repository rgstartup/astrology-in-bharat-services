import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';

@Injectable()
export class GetExpertByUserIdUseCase {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly expertProfileRepo: Repository<ProfileExpert>,
  ) {}

  async execute(userId: number) {
    return this.expertProfileRepo.findOne({
      where: { user: { id: userId } },
    });
  }
}
