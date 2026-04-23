import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileExpert } from '../../infrastructure/persistence/entities/profile-expert.entity';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this to your frontend URL in production
  },
})
export class ExpertGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) { }

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ExpertGateway');

  // Track online experts: userId -> Set of socketIds
  private expertSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from online experts if it was an expert socket
    for (const [userId, socketIds] of this.expertSockets.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        this.logger.log(
          `Expert ${userId} removed socket ${client.id} from tracking`,
        );

        if (socketIds.size === 0) {
          this.expertSockets.delete(userId);
          this.logger.log(`Expert ${userId} is now fully offline (all sockets gone)`);

          try {
            // Update database status to offline
            const profile = await this.profileRepo.findOne({ where: { better_auth_user_id: userId } });
            if (profile) {
              profile.is_available = false;
              await this.profileRepo.save(profile);
              this.logger.log(`Expert ${userId} availability set to false in DB due to final disconnect`);
            }

            // Broadcast to all clients
            this.server.emit('expert_status_changed', {
              expert_id: userId,
              is_available: false,
              status: 'offline',
            });
          } catch (error) {
            this.logger.error(`Failed to update DB status for expert ${userId} on disconnect:`, error.stack);
          }
        }
        break;
      }
    }
  }

  @SubscribeMessage('expert_online')
  async handleExpertOnline(client: Socket, payload: { userId: string }) {
    if (!this.expertSockets.has(payload.userId)) {
      this.expertSockets.set(payload.userId, new Set());
    }
    const socketIds = this.expertSockets.get(payload.userId) || new Set<string>();
    if (!this.expertSockets.has(payload.userId)) {
      this.expertSockets.set(payload.userId, socketIds);
    }
    const wasAlreadyOnline = socketIds.size > 0;
    socketIds.add(client.id);

    this.logger.log(
      `Expert ${payload.userId} is online via socket ${client.id} (Total sockets: ${socketIds.size})`,
    );

    // If this is the first socket, or if they were offline in DB, consider setting them to online
    // However, to respect manual toggle, we only set to true if they just connected and were not in our tracking map
    if (!wasAlreadyOnline) {
      try {
        const profile = await this.profileRepo.findOne({ where: { better_auth_user_id: payload.userId } });
        if (profile) {
          profile.is_available = true;
          await this.profileRepo.save(profile);
          this.logger.log(`Expert ${payload.userId} availability set to true in DB due to connection`);
        }
      } catch (error) {
        this.logger.error(`Failed to update DB status for expert ${payload.userId} on connect:`, error.stack);
      }
    }

    // Broadcast to all clients
    this.server.emit('expert_status_changed', {
      expert_id: payload.userId,
      is_available: true,
      status: 'online',
    });
  }

  @SubscribeMessage('expert_offline')
  async handleExpertOffline(client: Socket, payload: { userId: string }) {
    const socketIds = this.expertSockets.get(payload.userId);
    if (socketIds) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.expertSockets.delete(payload.userId);

        try {
          const profile = await this.profileRepo.findOne({ where: { better_auth_user_id: payload.userId } });
          if (profile) {
            profile.is_available = false;
            await this.profileRepo.save(profile);
            this.logger.log(`Expert ${payload.userId} availability set to false in DB via explicit offline message`);
          }
        } catch (error) {
          this.logger.error(`Failed to update DB status for expert ${payload.userId} on explicit offline:`, error.stack);
        }
      }
    }

    this.logger.log(
      `Expert ${payload.userId} requested offline via socket ${client.id}`,
    );

    // Broadcast to all clients
    this.server.emit('expert_status_changed', {
      expert_id: payload.userId,
      is_available: false,
      status: 'offline',
    });
  }

  // Method to manually notify status change (e.g., from ProfileService)
  notifyStatusChange(userId: string, isAvailable: boolean) {
    this.server.emit('expert_status_changed', {
      expert_id: userId,
      is_available: isAvailable,
      status: isAvailable ? 'online' : 'offline',
    });
  }

  notifyKycStatusUpdate(userId: string, status: string, reason?: string) {
    this.server.to(`expert_${userId}`).emit('kyc_status_updated', {
      status,
      reason,
    });
  }

  // Method to check if an expert is online
  isExpertOnline(userId: string): boolean {
    return this.expertSockets.has(userId);
  }
}
