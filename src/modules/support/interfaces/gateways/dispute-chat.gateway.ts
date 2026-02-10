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
import { DisputeMessage, SenderType } from '../../domain/entities/dispute-message.entity';
import { Inject } from '@nestjs/common';
import { IDisputeMessageRepository } from '../../domain/repositories/dispute-message.repository.interface';
import { IDisputeRepository } from '../../domain/repositories/dispute.repository.interface';
import { DisputeStatus } from '../../domain/entities/dispute.entity';

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

    constructor(
        @Inject(IDisputeMessageRepository)
        private readonly messageRepository: IDisputeMessageRepository,
        @Inject(IDisputeRepository)
        private readonly disputeRepository: IDisputeRepository,
    ) { }

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

    @SubscribeMessage('request_end_chat')
    async handleRequestEndChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { disputeId: number, userId: number, userName?: string, reason?: string },
    ) {
        const roomName = `dispute_${payload.disputeId}`;
        this.logger.log(`End chat requested for ${roomName} by user ${payload.userId}`);

        try {
            // Update dispute status
            await this.disputeRepository.update(payload.disputeId, {
                status: DisputeStatus.CLOSE_REQUESTED,
                adminNotes: payload.reason ? `User close request reason: ${payload.reason}` : 'User requested to close this dispute',
            });

            // Save as a system message in the chat history
            const systemMsg = await this.messageRepository.save(this.messageRepository.create({
                disputeId: payload.disputeId,
                senderType: SenderType.USER,
                senderId: payload.userId,
                message: payload.reason || 'User requested to end the chat',
                // isSystemNote: true,
            }));

            // Broadcast to everyone in the room (including admin)
            this.server.to(roomName).emit('dispute_close_requested', {
                disputeId: payload.disputeId,
                userId: payload.userId,
                userName: payload.userName || 'User',
                reason: payload.reason || null,
                systemMessage: systemMsg, // Send the saved message object
            });

            // Also emit as a new message so it appears in the chat list immediately
            this.server.to(roomName).emit('new_message', {
                ...systemMsg,
                senderName: 'System',
            });

        } catch (error) {
            this.logger.error(`Error handling end chat request: ${error.message}`);
        }

        return { status: 'request_sent', room: roomName };
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

    emitDisputeCloseRequested(disputeId: number, data: any) {
        this.logger.log(`Emitting dispute_close_requested to dispute_${disputeId}`);
        this.server.to(`dispute_${disputeId}`).emit('dispute_close_requested', data);
    }

    emitDisputeClosed(disputeId: number, data: any) {
        this.logger.log(`Emitting dispute_closed to dispute_${disputeId}`);
        this.server.to(`dispute_${disputeId}`).emit('dispute_closed', data);
    }
}
