import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallSessionStatus } from '../../infrastructure/persistence/entities/call-session.entity';
import { TwilioService } from '../../infrastructure/services/twilio.service';
import { CallGateway } from '../../call.gateway';

@Injectable()
export class AcceptCallUseCase {
    constructor(
        @InjectRepository(CallSession)
        private sessionRepo: Repository<CallSession>,
        private twilioService: TwilioService,
        private callGateway: CallGateway,
    ) { }

    async execute(expertId: number, sessionId: number) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId },
            relations: ['user', 'expert', 'expert.user'],
        });

        if (!session) {
            throw new NotFoundException('Call session not found');
        }

        if (session.expert.user.id !== expertId) {
            throw new BadRequestException('You are not the expert assigned to this call');
        }

        if (session.status === CallSessionStatus.ACTIVE) {
            // If already active and it's the same expert, just return the session/token
            const identity = `expert_${expertId}_${sessionId}`;
            const roomName = `call_room_${sessionId}`;
            const token = this.twilioService.generateToken(identity, session.type, roomName);
            return { session, token, roomName };
        }

        if (session.status !== CallSessionStatus.PENDING) {
            throw new BadRequestException(`Call is already ${session.status}`);
        }

        // Update session status
        session.status = CallSessionStatus.ACTIVE;
        session.start_time = new Date();
        const savedSession = await this.sessionRepo.save(session);

        // Generate token for expert
        const identity = `expert_${expertId}_${sessionId}`;
        const roomName = `call_room_${sessionId}`;
        const token = this.twilioService.generateToken(identity, session.type, roomName);

        const result = {
            session: savedSession,
            token,
            roomName,
        };

        // Notify user via socket that expert has accepted
        // Note: Users should be in 'call_room_{sessionId}'
        this.callGateway.server.to(`call_room_${sessionId}`).emit('call_accepted', result);

        return result;
    }
}
