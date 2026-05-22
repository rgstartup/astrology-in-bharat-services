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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'support',
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SupportGateway');
  private activeRooms = new Set<string>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to support: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from support: ${client.id}`);
  }

  @SubscribeMessage('register_admin')
  handleRegisterAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin_support_room');
    this.logger.log(`Admin ${client.id} joined admin_support_room`);
    return { status: 'registered' };
  }

  @SubscribeMessage('join_dispute_room')
  handleJoinDisputeRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { disputeId: string },
  ) {
    const roomName = `dispute_${payload.disputeId}`;
    client.join(roomName);
    this.activeRooms.add(roomName);
    this.logger.log(`Client ${client.id} joined ${roomName}`);
    return { status: 'joined' };
  }

  @SubscribeMessage('request_end_chat')
  handleRequestEndChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { disputeId: string; userId: string },
  ) {
    const data = { disputeId: payload.disputeId, userId: payload.userId };
    // Notify room
    this.server.to(`dispute_${payload.disputeId}`).emit('dispute_close_requested', data);
    // Notify admin
    this.server.to('admin_support_room').emit('dispute_close_requested', data);
    
    return { status: 'requested' };
  }

  notifyNewMessage(disputeId: string, message: any) {
    const roomName = `dispute_${disputeId}`;
    this.logger.log(`Emitting new_message to ${roomName}`);
    this.server.to(roomName).emit('new_message', message);
    
    // Also notify admin room for general updates
    this.server.to('admin_support_room').emit('new_message', message);
  }

  notifyStatusUpdate(disputeId: string, status: string, data: any) {
    const roomName = `dispute_${disputeId}`;
    this.server.to(roomName).emit('dispute_status_updated', { disputeId, status, ...data });
    this.server.to('admin_support_room').emit('dispute_status_updated', { disputeId, status, ...data });
  }
}
