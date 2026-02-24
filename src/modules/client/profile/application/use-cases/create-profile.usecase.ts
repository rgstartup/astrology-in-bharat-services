import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async execute(userId: number, dto: CreateProfileClientDto) {
    // prevent duplicate profile
    const exists = await this.repo.findOne({
      where: { user: { id: userId } },
    });
    if (exists) return exists;

    const profile = this.repo.create({
      ...dto,
      user: { id: userId } as any,
    });

    const savedProfile = await this.repo.save(profile);

    this.eventEmitter.emit(
      'client.profile.created',
      new ProfileCreatedEvent(userId, savedProfile.id, dto),
    );

    return savedProfile;
  }
}
