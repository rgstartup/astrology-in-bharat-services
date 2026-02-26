import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallSessionStatus, CallType } from '../../infrastructure/persistence/entities/call-session.entity';
import { ProfileExpert } from '@/modules/expert/profile/infrastructure/persistence/entities/profile-expert.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';

@Injectable()
export class InitiateCallUseCase {
    constructor(
        @InjectRepository(CallSession)
        private sessionRepo: Repository<CallSession>,
        @InjectRepository(ProfileExpert)
        private expertRepo: Repository<ProfileExpert>,
        private walletFacade: WalletFacade,
        private twilioService: TwilioService,
        private callGateway: CallGateway,
    ) { }

    async execute(userId: number, expertId: number, type: CallType = CallType.AUDIO) {
        const expert = await this.expertRepo.findOne({
            where: { id: expertId },
        });

        if (!expert) {
            throw new NotFoundException('Expert not found');
        }

        if (!expert.is_available) {
            throw new BadRequestException(
                'Expert is currently offline and not accepting call requests at the moment.',
            );
        }

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

        if (!hasBalance) {
            throw new BadRequestException(
                `Insufficient balance. Minimum ${minMins} minutes (₹${minBalanceRequired}) balance is required to start ${type} call.`,
            );
        }

        const session = this.sessionRepo.create({
            user_id: userId,
            expert_id: expertId,
            price_per_minute: callPrice,
            status: CallSessionStatus.PENDING,
            type: type,
            is_free: false,
        });

        const savedSession = await this.sessionRepo.save(session);
        console.log(`[InitiateCallUseCase] Session saved: id=${savedSession.id}`);

        // Reserve balance
        await this.walletFacade.reserveBalance(
            userId,
            minBalanceRequired,
            `call_${savedSession.id}`,
        );
        console.log(`[InitiateCallUseCase] Balance reserved for sessionId=${savedSession.id}`);

        // Generate Twilio Token for the user
        const identity = `user_${userId}_${savedSession.id}`;
        const roomName = `call_room_${savedSession.id}`;

        let token: string;
        try {
            token = this.twilioService.generateToken(identity, type, roomName);
            console.log(`[InitiateCallUseCase] Twilio Token generated for identity=${identity}`);
        } catch (error) {
            console.error('[InitiateCallUseCase] Twilio Token Generation failed:', error);
            // Optionally cleanup the reserved balance and session if it's critical
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

        // Notify expert via socket
        this.callGateway.notifyExpertNewCall(expertId, result);
        console.log(`[InitiateCallUseCase] Expert notified of new call sessionId=${savedSession.id}`);

        return result;
    }
}
