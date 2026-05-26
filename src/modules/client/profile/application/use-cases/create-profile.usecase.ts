// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { CreateProfileClientDto } from '../../infrastructure/dto/profile-client.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileCreatedEvent } from '../../domain/events/profile-events';
import { BaseService } from '@/common/services/transaction.service';

@Injectable()
export class CreateProfileUseCase extends BaseService<ProfileClient> {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly profileRepo: Repository<ProfileClient>,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(profileRepo);
   }

  async execute(userId: string, dto: CreateProfileClientDto, queryRunner?: QueryRunner) {
    const repo = this.getRepo(queryRunner);
    
    const existingProfile = await repo.findOne({
      where: { user: { id: userId } },
    });
    
    if (existingProfile) return existingProfile;

    const profile = repo.create({
      ...dto,
      user: { id: userId },
    });

    const savedProfile = await repo.save(profile);

    this.eventEmitter.emit(
      'client.profile.created',
      new ProfileCreatedEvent(userId, savedProfile.id, dto),
    );

    return savedProfile;
  }
}
