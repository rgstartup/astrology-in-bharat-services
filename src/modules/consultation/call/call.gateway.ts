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
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { CallFacade } from './application/call.facade';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';
import { CallSessionStatus } from './infrastructure/entities/call-session.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'call',
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('CallGateway');
  private expertSockets = new Map<string, string>(); // expert_id -> socketId
  private sessionTimers = new Map<string, NodeJS.Timeout>();
  private triggeredFreeLimit = new Set<string>();

  constructor(
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to call: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from call: ${client.id}`);
    for (const [expert_id, socketId] of this.expertSockets.entries()) {
      if (socketId === client.id) {
        this.expertSockets.delete(expert_id);
        this.logger.log(
          `Expert ${expert_id} unregistered from call due to disconnect`,
        );
        break;
      }
    }
  }

  @SubscribeMessage('register_expert')
  async handleRegisterExpert(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { expert_id: string },
  ) {
    this.expertSockets.set(payload.expert_id, client.id);
    await client.join(`expert_${payload.expert_id}`);
    this.logger.log(
      `Expert ${payload.expert_id} registered for calls. Socket ID: ${client.id}`,
    );
    return { status: 'registered' };
  }

  notifyExpertNewCall(expert_id: string, callData: unknown) {
    const roomName = `expert_${expert_id}`;
    this.server.to(roomName).emit('new_call_request', callData);
    this.logger.log(
      `[Notification] ✅ Emitted new_call_request to ${roomName} for sessionId: ${(callData as { session: { id: string } }).session.id}`,
    );
  }

  notifyExpertStatusUpdate(
    expert_id: string,
    event: 'call_accepted' | 'call_ended',
    data: unknown,
  ) {
    const roomName = `expert_${expert_id}`;
    this.server.to(roomName).emit(event, data);
    this.logger.log(
      `[Notification] ✅ Emitted ${event} to ${roomName} for sessionId: ${(data as { session?: { id?: string }; sessionId?: string }).session?.id || (data as { sessionId?: string }).sessionId}`,
    );
  }

  @SubscribeMessage('join_call_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    await client.join(`call_room_${payload.sessionId}`);
    this.logger.log(
      `Client ${client.id} joined call_room_${payload.sessionId}`,
    );

    // Start timer if session is already active (e.g. on rejoin)
    void this.startSessionTimer(payload.sessionId);

    return { status: 'joined' };
  }

  startSessionTimer(sessionId: string) {
    if (this.sessionTimers.has(sessionId)) return;

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const timer = setInterval(async () => {
      const currentSession = await this.callFacade.getSession(sessionId);
      if (
        !currentSession ||
        currentSession.status !== CallSessionStatus.ACTIVE
      ) {
        this.stopSessionTimer(sessionId);
        return;
      }

      const now = new Date();
      const durationMs = now.getTime() - currentSession.start_time.getTime();
      const durationMins = Math.floor(durationMs / 60000);

      // 1. Handle Free Session Expiry
      if (
        currentSession.is_free &&
        durationMins >= currentSession.free_minutes &&
        !this.triggeredFreeLimit.has(sessionId)
      ) {
        this.triggeredFreeLimit.add(sessionId);
        const balance = await this.walletFacade.getBalance(
          currentSession.client_id,
          'client_id',
        );
        const minReq = currentSession.price_per_minute * 5;

        this.server.to(`call_room_${sessionId}`).emit('free_time_ending_soon', {
          message:
            balance < minReq
              ? 'Your free session is ending soon. Please recharge to continue.'
              : `Your free session has ended. To continue at ₹${currentSession.price_per_minute}/min, please confirm.`,
          requireRecharge: balance < minReq,
          expertPrice: currentSession.price_per_minute,
          balance,
        });

        // Auto-end after 30s if no balance
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          const s = await this.callFacade.getSession(sessionId);
          const b = await this.walletFacade.getBalance(currentSession.client_id, 'client_id');
          if (b < minReq && s?.status === CallSessionStatus.ACTIVE) {
            await this.callFacade.end(sessionId);
            this.server.to(`call_room_${sessionId}`).emit('call_ended', {
              reason: 'free_limit_ended_no_balance',
              message: 'Your free consultation has ended.',
            });
          }
        }, 30000);
      }

      // 2. Handle Paid Balance Check
      const checkThreshold = currentSession.is_free
        ? currentSession.free_minutes + 1
        : 1;
      if (durationMins >= checkThreshold) {
        const balance = await this.walletFacade.getBalance(
          currentSession.client_id,
          'client_id',
        );
        if (balance < currentSession.price_per_minute) {
          this.server.to(`call_room_${sessionId}`).emit('balance_warning', {
            message: 'Insufficient balance. Call will end in 30 seconds.',
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          setTimeout(async () => {
            const s = await this.callFacade.getSession(sessionId);
            if (s?.status === CallSessionStatus.ACTIVE) {
              await this.callFacade.end(sessionId);
              this.server.to(`call_room_${sessionId}`).emit('call_ended', {
                reason: 'insufficient_balance',
                message: 'Call ended due to low balance.',
              });
            }
          }, 30000);
        }
      }
    }, 10000);

    this.sessionTimers.set(sessionId, timer);
  }

  stopSessionTimer(sessionId: string) {
    if (this.sessionTimers.has(sessionId)) {
      clearInterval(this.sessionTimers.get(sessionId));
      this.sessionTimers.delete(sessionId);
    }
    this.triggeredFreeLimit.delete(sessionId);
  }

  @SubscribeMessage('end_call')
  async handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    this.logger.log(
      `end_call received for sessionId=${payload.sessionId} from ${client.id}`,
    );
    try {
      await this.callFacade.end(payload.sessionId);
      this.stopSessionTimer(payload.sessionId);
      return { status: 'ended' };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to end call sessionId=${payload.sessionId}`,
        error,
      );
      return { status: 'error', message: (error as Error).message };
    }
  }
}
