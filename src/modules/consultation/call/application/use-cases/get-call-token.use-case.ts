import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession, CallSessionStatus, CallType } from '../../infrastructure/entities/call-session.entity';
import { TwilioService } from '../../infrastructure/services/twilio.service';

@Injectable()
export class GetCallTokenUseCase {
    constructor(
        @InjectRepository(CallSession)
        private readonly sessionRepo: Repository<CallSession>,
        private readonly twilioService: TwilioService,
    ) { }

    async execute(userId: string, sessionId: string) {
        const session = await this.sessionRepo.findOne({
            where: { id: sessionId as any },
            relations: ['user', 'expert', 'expert.user'],
        });

        if (!session) {
            throw new NotFoundException(`Call session ${sessionId} not found`);
        }

        // Check if user is either the client or .. the expert
        const isClient = session.user.id === userId;
        const isExpert = session.expert.user_id === userId; // In this project, expert.user_id usually links to User entity

        if (!isClient && !isExpert) {
            throw new ForbiddenException('You are not a participant in this call session');
        }

        if (session.status !== CallSessionStatus.ACTIVE) {
            // If it's still pending, expert shouldn't get a token via this (they use /accept)
            // But user might need it if they are re-joining or waiting
            if (isClient && session.status === CallSessionStatus.PENDING) {
                 // For client, we can return token even if pending so they are ready
            } else {
                 throw new ForbiddenException('Call session is not active');
            }
        }

        const identity = isExpert ? `expert_${userId}_${sessionId}` : `user_${userId}_${sessionId}`;
        const roomName = `call_room_${sessionId}`;
        
        const token = this.twilioService.generateToken(
            identity,
            session.type,
            roomName
        );

        return {
            token,
            roomName,
            type: session.type,
            session
        };
    }
}
