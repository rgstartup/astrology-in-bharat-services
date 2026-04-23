import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfilePolicy } from '../../domain/policies/profile.policy';
import { KycStatusChangedEvent } from '../../domain/events/profile-events';

@Injectable()
export class UpdateKycStatusUseCase {
  private readonly logger = new Logger(UpdateKycStatusUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(userId: number, status: string, reason?: string) {
    const targetStatus = status === 'active' ? 'approved' : status;

    const profile = await this.profileRepo.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException(`Expert profile not found for user ${userId}`);
    }

    profile.kyc_status = targetStatus === 'rejected' ? 'pending' : targetStatus;
    profile.rejection_reason = reason ?? null;

    const savedProfile = await this.profileRepo.save(profile);

    this.eventEmitter.emit(
      'expert.kyc.status-changed',
      new KycStatusChangedEvent(savedProfile.better_auth_user_id, savedProfile.id, status, reason),
    );

    return savedProfile;
  }
}
