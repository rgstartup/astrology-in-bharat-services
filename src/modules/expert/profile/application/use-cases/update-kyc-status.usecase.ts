import { Injectable, Logger } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
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

  async execute(expert_id: string, status: string, reason?: string) {
    const user = await this.userRepo.findOne({
      where: { id: expert_id as any }
    });

    // Map 'active' (from UI) to 'approved' (for DB)
    const targetStatus = status === 'active' ? 'approved' : status;

    let profile = await this.profileRepo.findOne({ where: { user: { id: expert_id as any } } });

    if (!user || (!profile && targetStatus !== 'approved')) {
      ProfilePolicy.ensureProfileExists(null);
    }

    // If profile is missing and we are approving, create it
    if (!profile && targetStatus === 'approved') {
      this.logger.log(`Creating missing profile for expert ${expert_id} during approval`);
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

    await this.profileRepo.save(profile);

    // Emit domain event - Side effects (sockets, emails) handled in KycStatusChangedHandler
    this.eventEmitter.emit(
      'expert.kyc.status-changed',
      new KycStatusChangedEvent(user!.id as any, profile.id as any, status, reason),
    );

    return new BooleanMessage();
  }
}
