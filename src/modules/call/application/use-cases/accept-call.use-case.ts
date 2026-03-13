import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/persistence/entities/call-session.entity';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallAcceptedEvent } from '../../domain/events/call.events';

@Injectable()
export class AcceptCallUseCase {
  private readonly logger = new Logger(AcceptCallUseCase.name);

  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    private readonly twilioService: TwilioService,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(expertId: number, sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['user', 'expert', 'expert.user'],
    });

    CallPolicy.ensureSessionExists(session);
    CallPolicy.ensureExpertAssignedToSession(session.expert.user.id, expertId);

    if (session.status === CallSessionStatus.ACTIVE) {
      // If already active and it's the same expert, just return the session/token
      const identity = `expert_${expertId}_${sessionId}`;
      const roomName = `call_room_${sessionId}`;
      const token = this.twilioService.generateToken(
        identity,
        session.type,
        roomName,
      );
      return { session, token, roomName };
    }

    CallPolicy.ensureSessionCanBeAccepted(session.status);

    session.status = CallSessionStatus.ACTIVE;
    session.start_time = new Date();
    const savedSession = await this.sessionRepo.save(session);
    this.logger.log(`Session activated: id=${savedSession.id}`);

    // Generate token for expert
    const identity = `expert_${expertId}_${sessionId}`;
    const roomName = `call_room_${sessionId}`;
    const token = this.twilioService.generateToken(
      identity,
      session.type,
      roomName,
    );
    this.logger.log(`Twilio token generated for expert identity=${identity}`);

    const result = {
      session: savedSession,
      token,
      roomName,
    };

    this.callGateway.server
      .to(`call_room_${sessionId}`)
      .emit('call_accepted', result);
    
    // Also notify expert dashboard (any open tab)
    this.callGateway.notifyExpertStatusUpdate(session.expert_id, 'call_accepted', result);

    this.logger.log(
      `Client notified of call acceptance sessionId=${sessionId}`,
    );
    this.eventEmitter.emit(
      'call.accepted',
      new CallAcceptedEvent(savedSession.id, expertId, savedSession.type),
    );

    return result;
  }
}
