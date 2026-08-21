import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { CreateProfileClientDto } from '../../infrastructure/dto/profile-client.dto';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import crypto from 'node:crypto';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class CreateProfileUseCase extends BaseService<ProfileClient> {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly profileRepo: Repository<ProfileClient>) {
    super(profileRepo);
  }

  async execute(
    userId: string,
    dto: CreateProfileClientDto,
    queryRunner?: QueryRunner,
  ) {
    const repo = this.getRepo(queryRunner);

    const existingProfile = await repo.findOne({
      where: { user: { id: userId } },
    });

    if (existingProfile) return existingProfile;

    const profile = repo.create();
    Object.assign(profile, dto);
    profile.user = { id: userId } as User;

    const suffix = crypto
      .randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);
    profile.uid = `AIB-USR-${suffix}`;

    const savedProfile = await repo.save(profile);

    return savedProfile;
  }
}
