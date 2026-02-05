import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'notifications',
})
export class NotificationGateway {
    @WebSocketServer()
    server: Server;

    private logger = new Logger('NotificationGateway');
    private userSockets = new Map<number, string>(); // userId -> socketId

    @SubscribeMessage('register_user')
    handleRegisterUser(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { userId: number },
    ) {
        this.userSockets.set(payload.userId, client.id);
        client.join(`user_${payload.userId}`);
        this.logger.log(`User ${payload.userId} registered for notifications`);
        return { status: 'registered' };
    }

    // Method to emit notification to specific user
    emitToUser(userId: number, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data);
        this.logger.log(`Emitted ${event} to user ${userId}`);
    }

    // Method to emit to all admins
    emitToAdmins(event: string, data: any) {
        this.server.to('admin_room').emit(event, data);
        this.logger.log(`Emitted ${event} to all admins`);
    }

    @SubscribeMessage('register_admin')
    handleRegisterAdmin(@ConnectedSocket() client: Socket) {
        client.join('admin_room');
        this.logger.log(`Admin registered: ${client.id}`);
        return { status: 'registered' };
    }
}
