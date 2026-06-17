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
  server!: Server;

  private logger = new Logger('NotificationGateway');
  private profileSockets = new Map<string, string>(); // profileId -> socketId

  @SubscribeMessage('register_user')
  async handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { profileId: string },
  ) {
    this.profileSockets.set(payload.profileId, client.id);
    await client.join(`profile_${payload.profileId}`);
    this.logger.log(
      `Profile ${payload.profileId} registered for notifications`,
    );
    return { status: 'registered' };
  }

  emitToProfile(profileId: string, event: string, data: unknown) {
    this.server.to(`profile_${profileId}`).emit(event, data);
    this.logger.log(`Emitted ${event} to profile ${profileId}`);
  }

  // Method to emit to all admins
  emitToAdmins(event: string, data: unknown) {
    this.server.to('admin_room').emit(event, data);
    this.logger.log(`Emitted ${event} to all admins`);
  }

  @SubscribeMessage('register_admin')
  async handleRegisterAdmin(@ConnectedSocket() client: Socket) {
    await client.join('admin_room');
    this.logger.log(`Admin registered: ${client.id}`);
    return { status: 'registered' };
  }
}
