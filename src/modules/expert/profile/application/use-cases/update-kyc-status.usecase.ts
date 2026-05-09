import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfilePolicy } from '../../domain/policies/profile.policy';
import { KycStatusChangedEvent } from '../../domain/events/profile-events';

@Injectable()
export class UpdateKycStatusUseCase {
  private readonly logger = new Logger(UpdateKycStatusUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(expertId: number, status: string, reason?: string) {
    const user = await this.userRepo.findOne({
      where: { id: Number(expertId) },
      relations: ['profile_expert'],
    });

    // Map 'active' (from UI) to 'approved' (for DB)
    const targetStatus = status === 'active' ? 'approved' : status;

    if (!user || (!user.profile_expert && targetStatus !== 'approved')) {
      ProfilePolicy.ensureProfileExists(null);
    }

    let profile = user!.profile_expert;

    // If profile is missing and we are approving, create it
    if (!profile && targetStatus === 'approved') {
      this.logger.log(`Creating missing profile for expert ${expertId} during approval`);
      profile = this.profileRepo.create({
        user: { id: user!.id } as any,
        kyc_status: 'approved',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    if (!profile) {
      throw new Error(`Profile not found and cannot be created for status ${status}`);
    }

    // If rejected, do NOT set status to rejected in DB. Reset to pending.
    if (targetStatus === 'rejected') {
      profile.kyc_status = 'pending';
    } else {
      profile.kyc_status = targetStatus;
    }

    profile.rejection_reason = reason || null;

    if (status === 'approved') {
      await this.userRepo.update(user!.id, { email_verified_at: new Date() });
    }

    const savedProfile = await this.profileRepo.save(profile);

    // Emit domain event - Side effects (sockets, emails) handled in KycStatusChangedHandler
    this.eventEmitter.emit(
      'expert.kyc.status-changed',
      new KycStatusChangedEvent(user!.id, profile.id, status, reason),
    );

    return savedProfile;
  }
}
