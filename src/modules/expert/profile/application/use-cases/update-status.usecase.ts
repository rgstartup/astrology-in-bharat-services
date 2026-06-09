import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
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
  ) { }

  async execute(user: User, isAvailable: boolean) {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: user.id } },
    });

    ProfilePolicy.ensureProfileExists(profile);

    // Business Logic: Prevent going offline if there are active sessions
    if (isAvailable === false) {
      const activeSessionsCount = await this.chatFacade.getExpertSessionCount(profile.id as any, {
        status: [ChatSessionStatus.ACTIVE, ChatSessionStatus.PENDING]
      });

      if (activeSessionsCount > 0) {
        this.logger.warn(`Expert ${user.email} tried to go offline with ${activeSessionsCount} active sessions.`);
        throw new ActiveSessionOfflineError();
      }
    }

    profile.is_available = isAvailable;
    await this.profileRepo.save(profile);

    // Emit event
    this.eventEmitter.emit(
      'expert.status.changed',
      new ExpertStatusChangedEvent(user.id as any, isAvailable),
    );

    return new BooleanMessage(true, 'Expert status updated successfully');
  }
}
