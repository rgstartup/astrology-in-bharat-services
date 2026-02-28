import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/persistence/entities/call-session.entity';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallEndedEvent } from '../../domain/events/call.events';

@Injectable()
export class EndCallUseCase {
  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    private readonly callGateway: CallGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(sessionId: number) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    CallPolicy.ensureSessionExists(session);

    if (
      session.status === CallSessionStatus.COMPLETED ||
      session.status === CallSessionStatus.CANCELLED
    ) {
      return session;
    }

    session.status = CallSessionStatus.COMPLETED;
    session.end_time = new Date();

    if (session.start_time) {
      const durationMs =
        session.end_time.getTime() - session.start_time.getTime();
      session.duration_seconds = Math.floor(durationMs / 1000);
      session.final_price =
        Math.ceil(session.duration_seconds / 60) * session.price_per_minute;
    }

    const savedSession = await this.sessionRepo.save(session);

    this.callGateway.server
      .to(`call_room_${sessionId}`)
      .emit('call_ended', { sessionId });
    this.eventEmitter.emit(
      'call.ended',
      new CallEndedEvent(
        savedSession.id,
        savedSession.user_id,
        savedSession.expert_id,
        savedSession.duration_seconds,
        savedSession.final_price,
      ),
    );

    return savedSession;
  }
}
