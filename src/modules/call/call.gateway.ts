import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { CallFacade } from './application/call.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { CallSessionStatus } from './infrastructure/persistence/entities/call-session.entity';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'call',
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('CallGateway');
    private expertSockets = new Map<number, string>(); // expertId -> socketId
    private sessionTimers = new Map<number, NodeJS.Timeout>();
    private triggeredFreeLimit = new Set<number>();

    constructor(
        @Inject(forwardRef(() => CallFacade))
        private readonly callFacade: CallFacade,
        private readonly walletFacade: WalletFacade,
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to call: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from call: ${client.id}`);
        for (const [expertId, socketId] of this.expertSockets.entries()) {
            if (socketId === client.id) {
                this.expertSockets.delete(expertId);
                this.logger.log(`Expert ${expertId} unregistered from call due to disconnect`);
                break;
            }
        }
    }

    @SubscribeMessage('register_expert')
    handleRegisterExpert(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { expertId: number },
    ) {
        this.expertSockets.set(payload.expertId, client.id);
        client.join(`expert_${payload.expertId}`);
        this.logger.log(`Expert ${payload.expertId} registered for calls. Socket ID: ${client.id}`);
        return { status: 'registered' };
    }

    notifyExpertNewCall(expertId: number, callData: any) {
        const roomName = `expert_${expertId}`;
        this.server.to(roomName).emit('new_call_request', callData);
        this.logger.log(`[Notification] ✅ Emitted new_call_request to ${roomName} for sessionId: ${callData.session.id}`);
    }

    notifyExpertStatusUpdate(
        expertId: number,
        event: 'call_accepted' | 'call_ended',
        data: any,
    ) {
        const roomName = `expert_${expertId}`;
        this.server.to(roomName).emit(event, data);
        this.logger.log(`[Notification] ✅ Emitted ${event} to ${roomName} for sessionId: ${data.session?.id || data.sessionId}`);
    }

    @SubscribeMessage('join_call_room')
    handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        client.join(`call_room_${payload.sessionId}`);
        this.logger.log(`Client ${client.id} joined call_room_${payload.sessionId}`);
        
        // Start timer if session is already active (e.g. on rejoin)
        this.startSessionTimer(payload.sessionId);
        
        return { status: 'joined' };
    }

    async startSessionTimer(sessionId: number) {
        if (this.sessionTimers.has(sessionId)) return;

        const timer = setInterval(async () => {
            const currentSession = await this.callFacade.getSession(sessionId);
            if (!currentSession || currentSession.status !== CallSessionStatus.ACTIVE) {
                this.stopSessionTimer(sessionId);
                return;
            }

            const now = new Date();
            const durationMs = now.getTime() - currentSession.start_time.getTime();
            const durationMins = Math.floor(durationMs / 60000);

            // 1. Handle Free Session Expiry
            if (
                currentSession.is_free &&
                durationMins >= currentSession.free_minutes &&
                !this.triggeredFreeLimit.has(sessionId)
            ) {
                this.triggeredFreeLimit.add(sessionId);
                const balance = await this.walletFacade.getBalance(currentSession.user_id);
                const minReq = currentSession.price_per_minute * 5;

                this.server.to(`call_room_${sessionId}`).emit('free_time_ending_soon', {
                    message: balance < minReq
                        ? 'Your free session is ending soon. Please recharge to continue.'
                        : `Your free session has ended. To continue at ₹${currentSession.price_per_minute}/min, please confirm.`,
                    requireRecharge: balance < minReq,
                    expertPrice: currentSession.price_per_minute,
                    balance,
                });

                // Auto-end after 30s if no balance
                setTimeout(async () => {
                    const s = await this.callFacade.getSession(sessionId);
                    const b = await this.walletFacade.getBalance(currentSession.user_id);
                    if (b < minReq && s?.status === CallSessionStatus.ACTIVE) {
                        await this.callFacade.end(sessionId);
                        this.server.to(`call_room_${sessionId}`).emit('call_ended', { 
                            reason: 'free_limit_ended_no_balance',
                            message: 'Your free consultation has ended.'
                        });
                    }
                }, 30000);
            }

            // 2. Handle Paid Balance Check
            const checkThreshold = currentSession.is_free ? currentSession.free_minutes + 1 : 1;
            if (durationMins >= checkThreshold) {
                const balance = await this.walletFacade.getBalance(currentSession.user_id);
                if (balance < currentSession.price_per_minute) {
                    this.server.to(`call_room_${sessionId}`).emit('balance_warning', {
                        message: 'Insufficient balance. Call will end in 30 seconds.',
                    });

                    setTimeout(async () => {
                        const s = await this.callFacade.getSession(sessionId);
                        if (s?.status === CallSessionStatus.ACTIVE) {
                            await this.callFacade.end(sessionId);
                            this.server.to(`call_room_${sessionId}`).emit('call_ended', { 
                                reason: 'insufficient_balance',
                                message: 'Call ended due to low balance.'
                            });
                        }
                    }, 30000);
                }
            }
        }, 10000);

        this.sessionTimers.set(sessionId, timer);
    }

    stopSessionTimer(sessionId: number) {
        if (this.sessionTimers.has(sessionId)) {
            clearInterval(this.sessionTimers.get(sessionId));
            this.sessionTimers.delete(sessionId);
        }
        this.triggeredFreeLimit.delete(sessionId);
    }

    @SubscribeMessage('end_call')
    async handleEndCall(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        this.logger.log(`end_call received for sessionId=${payload.sessionId} from ${client.id}`);
        try {
            await this.callFacade.end(payload.sessionId);
            this.stopSessionTimer(payload.sessionId);
            return { status: 'ended' };
        } catch (error) {
            this.logger.error(`Failed to end call sessionId=${payload.sessionId}`, error);
            return { status: 'error', message: error.message };
        }
    }
}
