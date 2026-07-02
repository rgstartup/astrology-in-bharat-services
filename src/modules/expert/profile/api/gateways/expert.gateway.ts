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
import { ProfileExpert } from '../../infrastructure/entities/profile-expert.entity';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this to your frontend URL in production
  },
})
export class ExpertGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    @InjectRepository(ProfileExpert)
    private readonly profileRepo: Repository<ProfileExpert>,
  ) {}

  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ExpertGateway');

  // Track online experts: userId -> Set of socketIds
  private expertSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(
      `[Socket] 🔴 Client disconnected from ExpertGateway: ${client.id}`,
    );

    // Remove from online experts if it was an expert socket
    for (const [userId, socketIds] of this.expertSockets.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        this.logger.log(
          `[Socket] 🔄 Expert ${userId} removed socket ${client.id} from tracking. Remaining sockets: ${socketIds.size}`,
        );

        if (socketIds.size === 0) {
          this.expertSockets.delete(userId);
          this.logger.log(
            `[Socket] ⏹️ Expert ${userId} is now fully offline (all tabs closed)`,
          );

          try {
            // Update database status to offline
            const profile = await this.profileRepo.findOne({
              where: { user: { id: userId.toString() } },
              relations: ['user'],
            });

            if (profile) {
              profile.is_available = false;
              await this.profileRepo.save(profile);
              this.logger.log(
                `[DB] ✅ Expert ${userId} availability set to false in DB due to final disconnect`,
              );
            }

            // Broadcast status change to ALL clients (including User App)
            const statusPayload = {
              expert_id: userId,
              is_available: false,
              status: 'offline',
              timestamp: new Date().toISOString(),
            };

            this.server.emit('expert_status_changed', statusPayload);
            this.logger.log(
              `[Socket] 📢 Broadcasted offline status for expert ${userId}`,
            );
          } catch (error) {
            this.logger.error(
              `[Error] ❌ Failed to update DB status for expert ${userId} on disconnect:`,
              (error as Error).stack,
            );
          }
        }
        break;
      }
    }
  }

  @SubscribeMessage('expert_online')
  async handleExpertOnline(client: Socket, payload: { userId: string }) {
    const userId = payload.userId;
    if (!userId) return { status: 'error', message: 'Invalid userId' };

    if (!this.expertSockets.has(userId)) {
      this.expertSockets.set(userId, new Set());
    }

    const socketIds = this.expertSockets.get(userId)!;
    const wasAlreadyOnline = socketIds.size > 0;
    socketIds.add(client.id);

    // Join room for private notifications
    await client.join(`expert_${userId}`);

    this.logger.log(
      `[Socket] 🟢 Expert ${userId} is online via socket ${client.id} (Total sessions: ${socketIds.size})`,
    );

    // If this is the first session, update DB status
    if (!wasAlreadyOnline) {
      try {
        const profile = await this.profileRepo.findOne({
          where: { user: { id: userId.toString() } },
          relations: ['user'],
        });

        if (profile && !profile.is_available) {
          profile.is_available = true;
          await this.profileRepo.save(profile);
          this.logger.log(
            `[DB] ✅ Expert ${userId} availability set to true in DB due to new connection`,
          );
        }
      } catch (error) {
        this.logger.error(
          `[Error] ❌ Failed to update DB status for expert ${userId} on connect:`,
          (error as Error).stack,
        );
      }
    }

    // Broadcast ALWAYS when someone announces they are online to ensure UI sync
    const statusPayload = {
      expert_id: userId,
      is_available: true,
      status: 'online',
      timestamp: new Date().toISOString(),
    };

    this.server.emit('expert_status_changed', statusPayload);
    return { status: 'success', userId };
  }

  @SubscribeMessage('expert_offline')
  async handleExpertOffline(client: Socket, payload: { userId: string }) {
    const userId = payload.userId;
    if (!userId) return { status: 'error', message: 'Invalid userId' };

    const socketIds = this.expertSockets.get(userId);
    if (socketIds) {
      socketIds.delete(client.id);
      if (socketIds.size === 0) {
        this.expertSockets.delete(userId);

        try {
          const profile = await this.profileRepo.findOne({
            where: { user: { id: userId.toString() } },
          });
          if (profile) {
            profile.is_available = false;
            await this.profileRepo.save(profile);
            this.logger.log(
              `[DB] ✅ Expert ${userId} availability set to false in DB via explicit offline message`,
            );
          }
        } catch (error) {
          this.logger.error(
            `[Error] ❌ Failed to update DB status for expert ${userId} on explicit offline:`,
            (error as Error).stack,
          );
        }
      }
    }

    this.logger.log(
      `[Socket] 🟡 Expert ${userId} requested offline via socket ${client.id}`,
    );

    // Broadcast to all clients
    this.server.emit('expert_status_changed', {
      expert_id: userId,
      is_available: false,
      status: 'offline',
      timestamp: new Date().toISOString(),
    });

    return { status: 'success', userId };
  }

  // Method to manually notify status change (e.g., from ProfileService)
  notifyStatusChange(userId: string, isAvailable: boolean) {
    this.server.emit('expert_status_changed', {
      expert_id: userId,
      is_available: isAvailable,
      status: isAvailable ? 'online' : 'offline',
      timestamp: new Date().toISOString(),
    });
  }

  notifyKycStatusUpdate(userId: string, status: string, reason?: string) {
    this.server.to(`expert_${userId}`).emit('kyc_status_updated', {
      status,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  notifyNewPujaBooking(userId: string, session: any) {
    this.server.to(`expert_${userId}`).emit('new_puja_request', session);
    this.logger.log(`[Socket] 📢 Emitted new_puja_request to expert_${userId}`);
  }

  // Method to check if an expert is online
  isExpertOnline(userId: string): boolean {
    return this.expertSockets.has(userId);
  }

  @OnEvent('user.blocked')
  async handleUserBlocked(payload: { userId: string }) {
    console.log(`[ExpertGateway] Received user.blocked event for userId: ${payload.userId}`);
    const { userId } = payload;
    this.logger.warn(`[Socket] Force disconnecting blocked user ${userId}`);
    
    // Disconnect socket if connected
    const socketIds = this.expertSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      for (const socketId of socketIds) {
        const client = this.server.sockets.sockets.get(socketId);
        if (client) {
          // Tell the frontend that it is now offline so the UI updates automatically
          client.emit('expert_status_changed', {
            expert_id: userId,
            is_available: false,
            status: 'offline',
            timestamp: new Date().toISOString(),
          });
          
          client.emit('error', { message: 'Your account has been blocked by the administrator. You cannot perform this action.' });
          
          // Delay disconnect to ensure packets are flushed
          setTimeout(() => {
            try {
              client.disconnect(true);
            } catch (e) {}
          }, 1000);
        }
      }
      this.expertSockets.delete(userId);
    }

    // Force offline in database directly
    try {
      await this.profileRepo.update(
        { user: { id: userId } },
        { is_available: false }
      );
      this.logger.log(`[Socket] Blocked user ${userId} forced offline in database`);
    } catch (error) {
      this.logger.error(`[Socket] Failed to force offline blocked user ${userId}:`, error);
    }
  }
}
