import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    WebSocketServer,
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { LiveSessionService } from '../../application/services/live-session.service';
import { CreateSessionDto } from '../../application/dtos/create-session.dto';
import { CreateMessageDto } from '../../application/dtos/create-message.dto';

@WebSocketGateway({ cors: true })
export class LiveSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(private readonly liveSessionService: LiveSessionService) { }

    handleConnection(client: Socket) {
        const role = client.handshake.query.role;
        if (role === 'admin') {
            client.join('admin');
        }
    }

    handleDisconnect(client: Socket) {
        // cleanup
    }

    @SubscribeMessage('session:join')
    handleJoinSession(@MessageBody() data: { sessionId: number }, @ConnectedSocket() client: Socket) {
        client.join(`session-${data.sessionId}`);
    }

    @SubscribeMessage('session:start')
    async handleSessionStart(@MessageBody() data: CreateSessionDto, @ConnectedSocket() client: Socket) {
        const session = await this.liveSessionService.startSession(data);
        client.join(`session-${session.id}`);
        return session;
    }

    @SubscribeMessage('session:end')
    async handleSessionEnd(@MessageBody() data: { sessionId: number }) {
        const session = await this.liveSessionService.endSession(data.sessionId);
        return session;
    }

    @SubscribeMessage('chat:send')
    async handleChatSend(@MessageBody() data: CreateMessageDto) {
        const message = await this.liveSessionService.addMessage(data);
        return message;
    }

    @OnEvent('session.started')
    handleSessionStartedEvent(payload: any) {
        this.server.to('admin').emit('session:started', payload);
    }

    @OnEvent('session.ended')
    handleSessionEndedEvent(payload: any) {
        this.server.to('admin').emit('session:ended', payload);
    }

    @OnEvent('chat.message')
    handleChatMessageEvent(payload: any) {
        // Send to admin
        this.server.to('admin').emit('chat:message', payload);
        // Send to participants
        this.server.to(`session-${payload.sessionId}`).emit('chat:received', payload);
    }
}
