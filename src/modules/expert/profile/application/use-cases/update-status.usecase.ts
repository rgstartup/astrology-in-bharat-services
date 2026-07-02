import { Injectable, Logger, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { IUser } from '@/common/types/access-token.payload';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProfilePolicy } from '../../domain/policies/profile.policy';
import { ExpertStatusChangedEvent } from '../../domain/events/profile-events';
import { ActiveSessionOfflineError } from '../../domain/errors/active-session-offline.error';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { ChatSessionStatus } from '@/modules/consultation/chat/infrastructure/entities/chat-session.entity';

@Injectable()
export class UpdateStatusUseCase {
  private readonly logger = new Logger(UpdateStatusUseCase.name);

  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
  ) {}

  async execute(user: IUser, isAvailable: boolean) {
    const where = user.profile
      ? { id: user.profile, user: { id: user.id } }
      : { user: { id: user.id } };
    const profile = await this.profileRepo.findOne({ where, relations: ['user'] });

    ProfilePolicy.ensureProfileExists(profile);

    // Only block the action if they are trying to go ONLINE while blocked
    if (profile.user?.is_blocked && isAvailable) {
      throw new ForbiddenException('Your account has been blocked by the administrator. You cannot perform this action.');
    }

    if (isAvailable && profile.kyc_status !== 'approved') {
      throw new ForbiddenException('Your account is inactive. You cannot go online.');
    }

    // Business Logic: Prevent going offline if there are active sessions
    if (isAvailable === false) {
      const activeSessionsCount = await this.chatFacade.getExpertSessionCount(
        profile.id as unknown as string,
        {
          status: [ChatSessionStatus.ACTIVE, ChatSessionStatus.PENDING],
        },
      );

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
