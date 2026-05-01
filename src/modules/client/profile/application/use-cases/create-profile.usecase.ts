import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/persistence/entities/profile-client.entity';
import { CreateProfileClientDto } from '../../infrastructure/persistence/dto/profile-client.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileCreatedEvent } from '../../domain/events/profile-events';

@Injectable()
export class CreateProfileUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(userId: string, dto: CreateProfileClientDto, queryRunner?: QueryRunner) {
    const repo = queryRunner ? queryRunner.manager.getRepository(ProfileClient) : this.repo;
    const exists = await repo.findOne({ where: { better_auth_user_id: userId } });
    if (exists) return exists;

    const profile = repo.create({ ...dto, better_auth_user_id: userId });
    const savedProfile = await repo.save(profile);

    this.eventEmitter.emit(
      'client.profile.created',
      new ProfileCreatedEvent(userId, savedProfile.id, dto),
    );

    return savedProfile;
  }
}
