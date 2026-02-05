import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ProfileExpert } from '../../domain/entities/profile-expert.entity';
import { IExpertRepository } from '../../domain/repositories/expert.repository.interface';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this to your frontend URL in production
  },
})
export class ExpertGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @Inject(IExpertRepository)
    private readonly expertRepository: IExpertRepository,
  ) { }

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ExpertGateway');

  // Track online experts: userId -> socketId
  private expertSockets: Map<number, string> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from online experts if it was an expert socket
    for (const [userId, socketId] of this.expertSockets.entries()) {
      if (socketId === client.id) {
        this.expertSockets.delete(userId);
        this.logger.log(
          `Expert ${userId} removed from tracking (disconnected)`,
        );

        try {
          // Update database status to offline
          const profile = await this.expertRepository.findByUserId(userId);
          if (profile) {
            profile.is_available = false;
            await this.expertRepository.save(profile);
            this.logger.log(`Expert ${userId} availability set to false in DB due to disconnect`);
          }
        } catch (error) {
          this.logger.error(`Failed to update DB status for expert ${userId} on disconnect:`, error.stack);
        }

        // Broadcast to all clients that this expert is now offline
        this.server.emit('expert_status_changed', {
          expert_id: userId,
          is_available: false,
          status: 'offline', // keeping status for backward compatibility if needed
        });
        break;
      }
    }
  }

  @SubscribeMessage('expert_online')
  handleExpertOnline(client: Socket, payload: { userId: number }) {
    this.expertSockets.set(payload.userId, client.id);
    this.logger.log(
      `Expert ${payload.userId} is online via socket ${client.id}`,
    );

    // Broadcast to all clients (especially the main frontend)
    this.server.emit('expert_status_changed', {
      expert_id: payload.userId,
      is_available: true,
      status: 'online',
    });
  }

  @SubscribeMessage('expert_offline')
  handleExpertOffline(client: Socket, payload: { userId: number }) {
    this.expertSockets.delete(payload.userId);
    this.logger.log(
      `Expert ${payload.userId} is offline via socket ${client.id}`,
    );

    // Broadcast to all clients
    this.server.emit('expert_status_changed', {
      expert_id: payload.userId,
      is_available: false,
      status: 'offline',
    });
  }

  // Method to manually notify status change (e.g., from ProfileService)
  notifyStatusChange(userId: number, isAvailable: boolean) {
    this.server.emit('expert_status_changed', {
      expert_id: userId,
      is_available: isAvailable,
      status: isAvailable ? 'online' : 'offline',
    });
  }

  notifyKycStatusUpdate(userId: number, status: string, reason?: string) {
    this.server.to(`expert_${userId}`).emit('kyc_status_updated', {
      status,
      reason,
    });
  }

  // Method to check if an expert is online
  isExpertOnline(userId: number): boolean {
    return this.expertSockets.has(userId);
  }
}
