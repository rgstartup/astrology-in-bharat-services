import {
  Injectable,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CallSession,
  CallSessionStatus,
  CallType,
} from '../../infrastructure/entities/call-session.entity';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallInitiatedEvent } from '../../domain/events/call.events';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/entities/profile-expert.entity';

@Injectable()
export class InitiateCallUseCase {
  private readonly logger = new Logger(InitiateCallUseCase.name);

  constructor(
    @InjectRepository(CallSession)
    private sessionRepo: Repository<CallSession>,
    @Inject(forwardRef(() => ExpertProfileFacade))
    private expertProfileFacade: ExpertProfileFacade,
    @Inject(forwardRef(() => WalletFacade)) private walletFacade: WalletFacade,
    private twilioService: TwilioService,
    @Inject(forwardRef(() => CallGateway))
    private callGateway: CallGateway,
    private eventEmitter: EventEmitter2,
  ) {}

  async execute(
    clientId: string,
    expert_id: string,
    type: CallType = CallType.AUDIO,
  ) {
    // Block duplicate sessions — client can only have ONE active/pending call at a time
    const existingSession = await this.sessionRepo.findOne({
      where: [
        { client_id: clientId, status: CallSessionStatus.ACTIVE },
        { client_id: clientId, status: CallSessionStatus.PENDING },
      ],
      relations: ['client', 'client.user'],
    });

    if (existingSession) {
      if (existingSession.expert_id === expert_id) {
        return {
          session: { ...existingSession, isResumed: true },
          token: '',
          roomName: `call_room_${existingSession.id}`,
        };
      }

      throw new InternalServerErrorException(
        existingSession.status === CallSessionStatus.ACTIVE
          ? `You already have an ongoing ${existingSession.type} call with another astrologer.`
          : `You already have a pending ${existingSession.type} call request with another astrologer. Please wait for them to accept or cancel it.`,
      );
    }

    const expert = await this.expertProfileFacade.getExpertById(expert_id);

    if (!expert) {
      throw new InternalServerErrorException('Expert not found');
    }

    CallPolicy.ensureExpertExists(expert as unknown as ProfileExpert);
    CallPolicy.ensureExpertAvailable(Boolean(expert.is_available));

    // ✅ Check if expert is already busy in an active or pending call/video session
    const expertBusyCall = await this.sessionRepo.findOne({
      where: [
        { expert_id, status: CallSessionStatus.ACTIVE },
        { expert_id, status: CallSessionStatus.PENDING },
      ],
    });

    if (expertBusyCall) {
      const busyType = expertBusyCall.type === CallType.VIDEO ? 'video call' : 'audio call';
      throw new InternalServerErrorException(
        expertBusyCall.status === CallSessionStatus.ACTIVE
          ? `This astrologer is currently busy in a ${busyType}. Please try again after some time.`
          : `This astrologer already has a pending ${busyType} request. Please try again in a few minutes.`,
      );
    }

    const callPrice =
      type === CallType.VIDEO
        ? Number(expert.video_call_price) ||
          (Number(expert.price) ? Number(expert.price) * 2 : 0) ||
          0
        : Number(expert.call_price) || Number(expert.price) || 0;

    const minMins = 5;
    const minBalanceRequired = callPrice * minMins;

    const callCount = await this.sessionRepo.count({
      where: { client_id: clientId, status: CallSessionStatus.COMPLETED },
    });

    const isFreeEnabled = process.env.FREE_CHAT_ENABLED === 'true';
    const isEligibleForFree = isFreeEnabled && callCount === 0;
    const freeMins = isEligibleForFree
      ? parseInt(process.env.FREE_CHAT_DURATION_MINS || '5', 10)
      : 0;

    if (!isEligibleForFree) {
      const hasBalance = await this.walletFacade.validateBalance(
        clientId,
        'client_id',
        minBalanceRequired,
      );
      CallPolicy.ensureSufficientBalance(
        hasBalance,
        minMins,
        minBalanceRequired,
        type,
      );
    }

    const session = this.sessionRepo.create({
      client_id: clientId,
      expert_id,
      price_per_minute: callPrice,
      status: CallSessionStatus.PENDING,
      type,
      is_free: isEligibleForFree,
      free_minutes: freeMins,
    });

    const savedSession = await this.sessionRepo.save(session);
    this.logger.log(
      `Session saved: id=${savedSession.id} (is_free: ${isEligibleForFree})`,
    );

    if (!isEligibleForFree) {
      await this.walletFacade.reserveBalance(
        clientId,
        'client_id',
        minBalanceRequired,
        `call_${savedSession.id}`,
      );
      this.logger.log(`Balance reserved for sessionId=${savedSession.id}`);
    }

    const identity = `client_${clientId}_${savedSession.id}`;
    const roomName = `call_room_${savedSession.id}`;

    let token: string;
    try {
      token = this.twilioService.generateToken(identity, type, roomName);
      this.logger.log(`Twilio token generated for identity=${identity}`);
    } catch (error) {
      this.logger.error('Twilio token generation failed', error);
      throw new InternalServerErrorException('Failed to generate call token');
    }

    const sessionWithDetails = await this.sessionRepo.findOne({
      where: { id: savedSession.id },
      relations: ['client', 'client.user'],
    });

    if (sessionWithDetails) {
      (sessionWithDetails as unknown as { expert: typeof expert }).expert =
        expert;
    }

    const result = {
      session: sessionWithDetails || savedSession,
      token,
      roomName,
    };

    this.callGateway.notifyExpertNewCall(expert_id, result);
    this.logger.log(`Expert notified of new call sessionId=${savedSession.id}`);
    this.eventEmitter.emit(
      'call.initiated',
      new CallInitiatedEvent(savedSession.id, clientId, expert_id, type),
    );

    return result;
  }
}
