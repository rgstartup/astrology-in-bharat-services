import { Logger } from '@nestjs/common';
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
import { DisputeMessage } from '../../domain/entities/dispute-message.entity';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    namespace: 'support',
})
export class DisputeChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('DisputeChatGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected to support chat: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected from support chat: ${client.id}`);
    }

    @SubscribeMessage('join_dispute_room')
    handleJoinDisputeRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { disputeId: number },
    ) {
        const roomName = `dispute_${payload.disputeId}`;
        client.join(roomName);
        this.logger.log(`Client ${client.id} joined ${roomName}`);
        return { status: 'joined', room: roomName };
    }

    @SubscribeMessage('leave_dispute_room')
    handleLeaveDisputeRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { disputeId: number },
    ) {
        const roomName = `dispute_${payload.disputeId}`;
        client.leave(roomName);
        this.logger.log(`Client ${client.id} left ${roomName}`);
        return { status: 'left', room: roomName };
    }

    // Emitters called by service
    emitNewMessage(disputeId: number, message: DisputeMessage) {
        this.logger.log(`Emitting new_message to dispute_${disputeId}`);
        this.server.to(`dispute_${disputeId}`).emit('new_message', message);
    }

    emitMessagesRead(disputeId: number, count: number) {
        this.logger.log(`Emitting messages_read to dispute_${disputeId}`);
        this.server.to(`dispute_${disputeId}`).emit('messages_read', { count });
    }
}
