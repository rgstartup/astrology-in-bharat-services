// @ts-nocheck
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
} from '../../infrastructure/entities/call-session.entity';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallAcceptedEvent } from '../../domain/events/call.events';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@Injectable()
export class AcceptCallUseCase {
  private readonly logger = new Logger(AcceptCallUseCase.name);

  constructor(
    @InjectRepository(CallSession)
    private readonly sessionRepo: Repository<CallSession>,
    private readonly twilioService: TwilioService,
    private readonly walletFacade: WalletFacade,
    @Inject(forwardRef(() => CallGateway))
    private readonly callGateway: CallGateway,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async execute(expertId: string, sessionId: string) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId as any },
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

    // Calculate Max Duration based on Wallet Balance + Free Minutes
    const balance = await this.walletFacade.getBalance(session.client_id);
    const paidMinutes = session.price_per_minute > 0 ? balance / session.price_per_minute : 0;
    const totalMinutes = (session.is_free ? session.free_minutes : 0) + paidMinutes;
    session.max_duration_seconds = Math.floor(totalMinutes * 60);
    
    this.logger.log(`Session ${sessionId}: User balance ${balance}, Max duration ${session.max_duration_seconds}s`);

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
    
    // Start the duration/balance timer
    this.callGateway.startSessionTimer(sessionId);
    
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
