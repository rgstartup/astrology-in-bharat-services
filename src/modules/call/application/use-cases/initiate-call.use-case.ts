import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallSessionStatus, CallType } from '../../infrastructure/persistence/entities/call-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';
import { CallPolicy } from '../../domain/policies/call.policy';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CallInitiatedEvent } from '../../domain/events/call.events';

@Injectable()
export class InitiateCallUseCase {
    private readonly logger = new Logger(InitiateCallUseCase.name);

    constructor(
        @InjectRepository(CallSession)
        private sessionRepo: Repository<CallSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
        private walletFacade: WalletFacade,
        private twilioService: TwilioService,
        private callGateway: CallGateway,
        private eventEmitter: EventEmitter2,
    ) { }

    async execute(userId: number, expertId: number, type: CallType = CallType.AUDIO) {
        const expert = await this.expertRepo.findOne({
            where: { id: expertId },
        });

        CallPolicy.ensureExpertExists(expert);
        CallPolicy.ensureExpertAvailable(expert.is_available);

        const callPrice = type === CallType.VIDEO
            ? (expert.video_call_price || (expert.price ? expert.price * 2 : 0) || 0)
            : (expert.call_price || expert.price || 0);

        const minMins = 5;
        const minBalanceRequired = callPrice * minMins;

        // Check balance (No free calls for now, keep it simple)
        const hasBalance = await this.walletFacade.validateBalance(
            userId,
            minBalanceRequired,
        );

        CallPolicy.ensureSufficientBalance(hasBalance, minMins, minBalanceRequired, type);

        const session = this.sessionRepo.create({
            user_id: userId,
            expert_id: expertId,
            price_per_minute: callPrice,
            status: CallSessionStatus.PENDING,
            type: type,
            is_free: false,
        });

        const savedSession = await this.sessionRepo.save(session);
        this.logger.log(`Session saved: id=${savedSession.id}`);

        // Reserve balance
        await this.walletFacade.reserveBalance(
            userId,
            minBalanceRequired,
            `call_${savedSession.id}`,
        );
        this.logger.log(`Balance reserved for sessionId=${savedSession.id}`);

        // Generate Twilio Token for the user
        const identity = `user_${userId}_${savedSession.id}`;
        const roomName = `call_room_${savedSession.id}`;

        let token: string;
        try {
            token = this.twilioService.generateToken(identity, type, roomName);
            this.logger.log(`Twilio token generated for identity=${identity}`);
        } catch (error) {
            this.logger.error('Twilio token generation failed', error);
            throw new InternalServerErrorException('Failed to generate call token');
        }

        // Fetch session with expert & user details for client
        const sessionWithDetails = await this.sessionRepo.findOne({
            where: { id: savedSession.id },
            relations: ['user', 'expert'],
        });

        const result = {
            session: sessionWithDetails || savedSession,
            token,
            roomName,
        };

        this.callGateway.notifyExpertNewCall(expertId, result);
        this.logger.log(`Expert notified of new call sessionId=${savedSession.id}`);
        this.eventEmitter.emit(
            'call.initiated',
            new CallInitiatedEvent(savedSession.id, userId, expertId, type),
        );

        return result;
    }
}
