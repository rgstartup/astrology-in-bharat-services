import { Logger, Inject } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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

  // Track online experts: userId -> Set of socketIds (handles multiple tabs)
  private userSockets: Map<number, Set<string>> = new Map();
  // Reverse mapping: socketId -> userId for efficient disconnect lookup
  private socketToUser: Map<string, number> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    // Remove this specific socket from the user's set
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      this.socketToUser.delete(client.id);

      // If no more sockets are left for this user, they are truly offline
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.logger.log(`Expert ${userId} is now fully offline (all tabs closed)`);

        try {
          // Update database status to offline
          const profile = await this.expertRepository.findByUserId(userId);
          if (profile) {
            profile.is_available = false;
            await this.expertRepository.save(profile);
            this.logger.log(`Expert ${userId} availability set to false in DB due to full disconnect`);
          }
        } catch (error) {
          this.logger.error(`Failed to update DB status for expert ${userId} on disconnect:`, error.stack);
        }

        // Broadcast to all clients that this expert is now offline
        this.server.emit('expert_status_changed', {
          expert_id: userId,
          is_available: false,
          status: 'offline',
        });
      } else {
        this.logger.log(`Expert ${userId} closed one tab, but ${sockets.size} tabs still open`);
      }
    }
  }

  @SubscribeMessage('expert_online')
  handleExpertOnline(client: Socket, payload: { userId: number }) {
    const { userId } = payload;

    // Initialize socket set for user if not exists
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }

    this.userSockets.get(userId).add(client.id);
    this.socketToUser.set(client.id, userId);

    this.logger.log(`Expert ${userId} is online via socket ${client.id} (Total tabs: ${this.userSockets.get(userId).size})`);

    // Broadcast to all clients
    this.server.emit('expert_status_changed', {
      expert_id: userId,
      is_available: true,
      status: 'online',
    });
  }

  @SubscribeMessage('expert_offline')
  async handleExpertOffline(client: Socket, payload: { userId: number }) {
    const { userId } = payload;

    // Forcefully remove all sockets for this user (user explicitly clicked offline)
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      for (const socketId of sockets) {
        this.socketToUser.delete(socketId);
      }
      this.userSockets.delete(userId);
    }

    this.logger.log(`Expert ${userId} manually went offline`);

    try {
      const profile = await this.expertRepository.findByUserId(userId);
      if (profile) {
        profile.is_available = false;
        await this.expertRepository.save(profile);
      }
    } catch (error) {
      this.logger.error(`Failed to update DB status for expert ${userId} on manual offline:`, error.stack);
    }

    // Broadcast to all clients
    this.server.emit('expert_status_changed', {
      expert_id: userId,
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
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }
}
