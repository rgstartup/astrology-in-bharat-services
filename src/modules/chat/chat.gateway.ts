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
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessageType } from './entities/chat-message.entity';
import { ChatSessionStatus } from './entities/chat-session.entity';
import { WalletService } from '../wallet/wallet.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('ChatGateway');
    private sessionTimers = new Map<number, NodeJS.Timeout>();
    private expertSockets = new Map<number, string>(); // expertId -> socketId

    constructor(
        private readonly chatService: ChatService,
        private readonly walletService: WalletService
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to chat: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from chat: ${client.id}`);
        // Remove from expert map if exists
        for (const [expertId, socketId] of this.expertSockets.entries()) {
            if (socketId === client.id) {
                this.expertSockets.delete(expertId);
                this.logger.log(`Expert ${expertId} unregistered due to disconnect`);
                break;
            }
        }
    }

    @SubscribeMessage('register_expert')
    handleRegisterExpert(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { expertId: number },
    ) {
        console.log(`[SocketDebug] Registering expert PROFILE ID ${payload.expertId} to socket client ${client.id}`);
        this.expertSockets.set(payload.expertId, client.id);
        client.join(`expert_${payload.expertId}`); // Join a private notification room
        this.logger.log(`Expert ${payload.expertId} registered and joined expert_${payload.expertId}`);
        console.log(`[SocketDebug] Expert PROFILE ID ${payload.expertId} is now in room expert_${payload.expertId}`);
        return { status: 'registered' };
    }

    notifyExpertNewRequest(expertId: number, session: any) {
        console.log(`[SocketDebug] Emitting 'new_chat_request' to expert room expert_${expertId}`);
        this.server.to(`expert_${expertId}`).emit('new_chat_request', session);
        this.logger.log(`Notified expert room expert_${expertId} of new session ${session.id}`);
    }

    /**
     * Notify an expert's dashboard about any session status change
     */
    notifyExpertStatusUpdate(expertId: number, event: 'session_activated' | 'session_ended', data: any) {
        console.log(`[SocketDebug] Emitting '${event}' to expert room expert_${expertId}`);
        this.server.to(`expert_${expertId}`).emit(event, data);
        this.logger.log(`Status update ${event} sent to expert room expert_${expertId}`);
    }

    @SubscribeMessage('join_room')
    async handleJoinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        const session = await this.chatService.getSession(payload.sessionId);
        if (!session) {
            return { status: 'error', message: 'Session not found' };
        }

        if (session.status === ChatSessionStatus.COMPLETED || session.status === ChatSessionStatus.EXPIRED) {
            console.log(`[SocketDebug] Blocked join attempt for session ${payload.sessionId} (Status: ${session.status})`);
            return { status: 'error', message: `Session is already ${session.status}` };
        }

        client.join(`room_${payload.sessionId}`);
        this.logger.log(`Client ${client.id} joined room_${payload.sessionId}`);
        return { status: 'joined' };
    }

    @SubscribeMessage('activate_session')
    async handleActivateSession(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        const session = await this.chatService.activateSession(payload.sessionId);
        this.server.to(`room_${payload.sessionId}`).emit('session_activated', session);

        // Notify expert dashboard directly
        if (session.expertId) {
            this.notifyExpertStatusUpdate(session.expertId, 'session_activated', session);
        }

        // Clear existing timer if any
        if (this.sessionTimers.has(payload.sessionId)) {
            clearInterval(this.sessionTimers.get(payload.sessionId));
        }

        // Start a timer that checks balance every minute
        const timer = setInterval(async () => {
            const currentSession = await this.chatService.getSession(payload.sessionId);
            if (!currentSession || currentSession.status !== ChatSessionStatus.ACTIVE) {
                clearInterval(timer);
                this.sessionTimers.delete(payload.sessionId);
                return;
            }

            const now = new Date();
            const durationMs = now.getTime() - currentSession.startTime.getTime();
            const durationMins = Math.floor(durationMs / 60000);

            // Check if wallet can afford another minute beyond the initial 5
            if (durationMins >= 5) {
                const balance = await this.walletService.getBalance(currentSession.userId);
                if (balance < currentSession.pricePerMinute) {
                    this.server.to(`room_${payload.sessionId}`).emit('balance_warning', {
                        message: 'Insufficient balance. Session will end in 30 seconds.'
                    });

                    setTimeout(async () => {
                        const s = await this.chatService.getSession(payload.sessionId);
                        if (s?.status === ChatSessionStatus.ACTIVE) {
                            await this.chatService.endChat(payload.sessionId);
                            this.server.to(`room_${payload.sessionId}`).emit('session_ended', { reason: 'insufficient_balance' });
                        }
                    }, 30000);
                }
            }
        }, 60000);

        this.sessionTimers.set(payload.sessionId, timer);
        return session;
    }

    @SubscribeMessage('send_message')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: {
            sessionId: number;
            senderId: number;
            senderType: 'user' | 'expert';
            content: string;
            type?: MessageType;
        },
    ) {
        // Validation: Only allow messages if session is active
        const session = await this.chatService.getSession(payload.sessionId);
        if (!session || session.status !== ChatSessionStatus.ACTIVE) {
            console.log(`[SocketDebug] Blocked message for session ${payload.sessionId} - Status: ${session?.status}`);
            return { status: 'error', message: 'Chat is not active' };
        }

        const savedMsg = await this.chatService.saveMessage(
            payload.sessionId,
            payload.senderId,
            payload.senderType,
            payload.content,
            payload.type || MessageType.TEXT,
        );

        this.server.to(`room_${payload.sessionId}`).emit('new_message', savedMsg);
        return savedMsg;
    }

    @SubscribeMessage('end_chat')
    async handleEndChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number },
    ) {
        const session = await this.chatService.endChat(payload.sessionId);
        this.server.to(`room_${payload.sessionId}`).emit('session_ended', session);

        // Notify expert dashboard directly
        if (session && session.expertId) {
            this.notifyExpertStatusUpdate(session.expertId, 'session_ended', session);
        }

        if (this.sessionTimers.has(payload.sessionId)) {
            clearInterval(this.sessionTimers.get(payload.sessionId));
            this.sessionTimers.delete(payload.sessionId);
        }
        return session;
    }

    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { sessionId: number; senderName: string; isTyping: boolean },
    ) {
        client.to(`room_${payload.sessionId}`).emit('typing_status', payload);
    }
}
