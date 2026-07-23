import { Injectable, Logger } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(expert_id: string, status: string, reason?: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: expert_id as unknown as string },
      });

      // Map 'active' (from UI) to 'approved' (for DB)
      const targetStatus = status === 'active' ? 'approved' : status;

      let profile = await queryRunner.manager.findOne(ProfileExpert, {
        where: { user: { id: expert_id as unknown as string } },
      });

      if (!user || (!profile && targetStatus !== 'approved')) {
        ProfilePolicy.ensureProfileExists(null);
      }

      // If profile is missing and we are approving, create it
      if (!profile && targetStatus === 'approved') {
        this.logger.log(
          `Creating missing profile for expert ${expert_id} during approval`,
        );
        profile = queryRunner.manager.create(ProfileExpert, {
          user: { id: user!.id } as unknown as User,
          kyc_status: 'approved',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      if (!profile) {
        throw new Error(
          `Profile not found and cannot be created for status ${status}`,
        );
      }

      // If rejected, do NOT set status to rejected in DB. Reset to pending.
      if (targetStatus === 'rejected') {
        profile.kyc_status = 'pending';
      } else {
        profile.kyc_status = targetStatus;
      }

      profile.rejection_reason = reason || null;

      if (status === 'approved') {
        await queryRunner.manager.update(User, user!.id, { email_verified_at: new Date() });
      }

      await queryRunner.manager.save(ProfileExpert, profile);

      await queryRunner.commitTransaction();

      // Emit domain event - Side effects (sockets, emails) handled in KycStatusChangedHandler
      this.eventEmitter.emit(
        'expert.kyc.status-changed',
        new KycStatusChangedEvent(
          user!.id as unknown as string,
          profile.id as unknown as string,
          status,
          reason,
        ),
      );

      return new BooleanMessage();
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
