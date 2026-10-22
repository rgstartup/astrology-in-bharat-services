import {
  Injectable,
  Logger,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { and, count, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../entities/profile-expert.entity';
import { IUser } from '@/shared/types/access-token.payload';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfilePolicy } from '../domain/policies/profile.policy';
import { ExpertStatusChangedEvent } from '../domain/events/profile-events';
import { ActiveSessionOfflineError } from '../domain/errors/active-session-offline.error';

/**
 * Updates expert availability status, preventing offline transition during active consultations.
 */
@Injectable()
export class UpdateStatusUseCase {
  private readonly logger = new Logger(UpdateStatusUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  async execute(user: IUser, isAvailable: boolean) {
    const where = user.profile
      ? { id: user.profile, user: { id: user.id } }
      : { user: { id: user.id } };
    const profile = await this.profileRepo.findOne({
      where,
      relations: ['user'],
    });

    ProfilePolicy.ensureProfileExists(profile);

    // Only block the action if they are trying to go ONLINE while blocked
    if (profile.user?.is_blocked && isAvailable) {
      throw new ForbiddenException(
        'Your account has been blocked by the administrator. You cannot perform this action.',
      );
    }

    if (isAvailable && profile.kyc_status !== 'approved') {
      throw new ForbiddenException(
        'Your account is inactive. You cannot go online.',
      );
    }

    // Business Logic: Prevent going offline if there are active sessions
    if (isAvailable === false) {
      const [countRow] = await this.db
        .select({ value: count() })
        .from(consultations)
        .where(
          and(
            eq(consultations.expert_id, profile.id),
            inArray(consultations.status, [
              ConsultationStatus.ACTIVE,
              ConsultationStatus.REQUESTED,
              ConsultationStatus.ACCEPTED,
            ]),
          ),
        );

      const activeSessionsCount = Number(countRow?.value ?? 0);

      if (activeSessionsCount > 0) {
        this.logger.warn(
          `Expert ${user.email} tried to go offline with ${activeSessionsCount} active sessions.`,
        );
        throw new ActiveSessionOfflineError();
      }
    }

    profile.is_available = isAvailable;
    await this.profileRepo.save(profile);

    // Emit event
    this.eventEmitter.emit(
      'expert.status.changed',
      new ExpertStatusChangedEvent(user.id, isAvailable),
    );

    return new BooleanMessage(true, 'Expert status updated successfully');
  }
}
