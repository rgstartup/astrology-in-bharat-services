import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/entities/call-session.entity';
import { TwilioService } from '../../infrastructure/services/twilio.service';

@Injectable()
export class GetCallTokenUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    private readonly twilioService: TwilioService,
  ) {}

  async execute(profileId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['client', 'client.user', 'expert', 'expert.user'],
    });

    if (!session) {
      throw new NotFoundException(`Call session ${sessionId} not found`);
    }

    const isClient = session.client_id === profileId;
    const isExpert = session.expert_id === profileId;

    if (!isClient && !isExpert) {
      throw new ForbiddenException(
        'You are not a participant in this call session',
      );
    }

    if (session.status !== CallSessionStatus.ACTIVE) {
      if (isClient && session.status === CallSessionStatus.PENDING) {
        // Client can get token even while pending so they are ready
      } else {
        throw new ForbiddenException('Call session is not active');
      }
    }

    const identity = isExpert
      ? `expert_${profileId}_${sessionId}`
      : `client_${profileId}_${sessionId}`;
    const roomName = `call_room_${sessionId}`;

    const token = this.twilioService.generateToken(
      identity,
      session.type,
      roomName,
    );

    return {
      token,
      roomName,
      type: session.type,
      session,
    };
  }
}
