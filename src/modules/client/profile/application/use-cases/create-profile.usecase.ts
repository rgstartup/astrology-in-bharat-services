import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { CreateProfileClientDto } from '../../infrastructure/dto/profile-client.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileCreatedEvent } from '../../domain/events/profile-events';
import { BaseService } from '@/common/services/transaction.service';
import { GetProfileUseCase } from './get-profile.usecase';
import { IUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';

@Injectable()
export class CreateProfileUseCase extends BaseService<ProfileClient> {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly profileRepo: Repository<ProfileClient>,
    private readonly eventEmitter: EventEmitter2,
    private readonly getProfileUseCase: GetProfileUseCase
  ) {
    super(profileRepo);
   }

  async execute(user : IUser, dto: CreateProfileClientDto, queryRunner?: QueryRunner) {
    const repo = this.getRepo(queryRunner);

    const existingProfile = await this.getProfileUseCase.execute(user, queryRunner);
    
    if (existingProfile) return existingProfile;

    const profileUser = new User();
    profileUser.id = user.id;

    const profile = repo.create({
      ...dto,
      user: profileUser,
    });

    const savedProfile = await repo.save(profile);

    this.eventEmitter.emit(
      'client.profile.created',
      new ProfileCreatedEvent(user.id, savedProfile.id, dto),
    );

    return savedProfile;
  }
}
