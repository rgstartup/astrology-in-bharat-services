import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ProfileClient } from '../../infrastructure/entities/profile-client.entity';
import { CreateProfileClientDto } from '../../infrastructure/dto/profile-client.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfileCreatedEvent } from '../../domain/events/profile-events';

@Injectable()
export class CreateProfileUseCase {
  constructor(
    @InjectRepository(ProfileClient)
    private readonly repo: Repository<ProfileClient>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(userId: number, dto: CreateProfileClientDto, queryRunner?: QueryRunner) {
    const repo = queryRunner ? queryRunner.manager.getRepository(ProfileClient) : this.repo;
    // prevent duplicate profile
    const exists = await repo.findOne({
      where: { user: { id: userId } },
    });
    if (exists) return exists;

    const profile = repo.create({
      ...dto,
      user: { id: userId } as any,
    });

    const savedProfile = await repo.save(profile);

    this.eventEmitter.emit(
      'client.profile.created',
      new ProfileCreatedEvent(userId, savedProfile.id, dto),
    );

    return savedProfile;
  }
}
