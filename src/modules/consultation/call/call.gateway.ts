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
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';
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
  private socketToSession = new Map<string, string>(); // socketId -> sessionId
  private disconnectTimeouts = new Map<string, NodeJS.Timeout>(); // sessionId -> timeout

  constructor(
    @Inject(forwardRef(() => CallFacade))
    private readonly callFacade: CallFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`[CallGateway] ✅ Client connected: ${client.id} | Total registered experts: ${this.expertSockets.size}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[CallGateway] ❌ Client disconnected: ${client.id}`);
    
    // Auto-disconnect logic (Grace period 30s)
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      this.logger.log(`[CallGateway] Socket ${client.id} belonged to active session ${sessionId}. Starting 30s auto-end timer.`);
      const timeout = setTimeout(async () => {
        try {
          const session = await this.callFacade.getSession(sessionId);
          if (session && session.status === CallSessionStatus.ACTIVE) {
            this.logger.warn(`[CallGateway] ⏱️ 30s grace period expired for session ${sessionId}. Auto-ending call.`);
            await this.callFacade.end({ sessionId, endedBy: 'system', reason: 'socket_disconnected' });
            this.stopSessionTimer(sessionId);
            this.server.to(`call_room_${sessionId}`).emit('call_ended', {
              reason: 'socket_disconnected',
              message: 'Call ended due to lost connection.',
            });
          }
        } catch (e) {
          this.logger.error(`[CallGateway] Failed to auto-end session ${sessionId}`, e);
        }
        this.disconnectTimeouts.delete(sessionId);
      }, 30000); // 30 seconds
      this.disconnectTimeouts.set(sessionId, timeout);
      this.socketToSession.delete(client.id);
    }

    for (const [expert_id, socketId] of this.expertSockets.entries()) {
      if (socketId === client.id) {
        this.expertSockets.delete(expert_id);
        this.logger.log(
          `[CallGateway] 🔴 Expert ${expert_id} UNREGISTERED from call (socket disconnected)`,
        );
        break;
      }
    }
    this.logger.log(`[CallGateway] Remaining registered experts: ${this.expertSockets.size}`);
  }

  @SubscribeMessage('register_expert')
  async handleRegisterExpert(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { expert_id: string },
  ) {
    this.logger.log(`[CallGateway] 📝 register_expert received: expert_id=${payload.expert_id}, socketId=${client.id}`);
    this.expertSockets.set(payload.expert_id, client.id);
    await client.join(`expert_${payload.expert_id}`);
    this.logger.log(
      `[CallGateway] ✅ Expert ${payload.expert_id} REGISTERED for calls. Socket ID: ${client.id} | Total experts: ${this.expertSockets.size}`,
    );
    // Log all registered experts
    this.logger.log(`[CallGateway] Registered experts map: ${JSON.stringify(Object.fromEntries(this.expertSockets))}`);
    return { status: 'registered' };
  }

  notifyExpertNewCall(expert_id: string, callData: unknown) {
    const roomName = `expert_${expert_id}`;
    const isExpertRegistered = this.expertSockets.has(expert_id);
    const expertSocketId = this.expertSockets.get(expert_id);
    this.logger.log(`[CallGateway] 📞 notifyExpertNewCall called for expert_id=${expert_id}`);
    this.logger.log(`[CallGateway] Is expert registered in socket map? ${isExpertRegistered} | socketId: ${expertSocketId || 'NOT FOUND'}`);
    this.logger.log(`[CallGateway] All registered experts: ${JSON.stringify(Object.fromEntries(this.expertSockets))}`);
    this.logger.log(`[CallGateway] Emitting 'new_call_request' to room: ${roomName}`);
    this.server.to(roomName).emit('new_call_request', callData);
    this.logger.log(
      `[CallGateway] ✅ Emitted new_call_request to ${roomName} for sessionId: ${(callData as { session: { id: string } }).session.id}`,
    );
    if (!isExpertRegistered) {
      this.logger.error(`[CallGateway] ⚠️  WARNING: Expert ${expert_id} is NOT registered in expertSockets map! Popup will NOT appear!`);
    }
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

    // Track for auto-disconnect
    this.socketToSession.set(client.id, payload.sessionId);
    
    // Clear any existing disconnect timeout if they reconnected in time
    if (this.disconnectTimeouts.has(payload.sessionId)) {
      this.logger.log(`[CallGateway] 🔄 User reconnected to session ${payload.sessionId}. Cleared auto-end timer.`);
      clearTimeout(this.disconnectTimeouts.get(payload.sessionId));
      this.disconnectTimeouts.delete(payload.sessionId);
    }

    // Start timer if session is already active (e.g. on rejoin)
    void this.startSessionTimer(payload.sessionId);

    return { status: 'joined' };
  }

  startSessionTimer(sessionId: string) {
    // Skip invalid (non-UUID) sessionIds — e.g. legacy numeric IDs from old DB records
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      this.logger.warn(
        `[Timer] Skipping invalid sessionId (not a UUID): "${sessionId}"`,
      );
      return;
    }
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

      // Hard Limit: End any call over 60 minutes
      if (durationMins >= 60) {
        this.logger.warn(`[CallGateway] Session ${sessionId} reached 1 hour max limit. Force ending.`);
        await this.callFacade.end({ sessionId, endedBy: 'system', reason: 'max_duration_reached' });
        this.server.to(`call_room_${sessionId}`).emit('call_ended', {
          reason: 'max_duration_reached',
          message: 'Maximum call duration of 1 hour reached.',
        });
        this.stopSessionTimer(sessionId);
        return;
      }

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

        // Auto-end after 30s if not confirmed
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          const s = await this.callFacade.getSession(sessionId);
          if (s?.status === CallSessionStatus.ACTIVE && s.is_free) {
            await this.callFacade.end({ sessionId, endedBy: 'system', reason: 'free_limit_ended_no_confirmation' });
            this.server.to(`call_room_${sessionId}`).emit('call_ended', {
              reason: 'free_limit_ended_no_confirmation',
              message: 'Your free consultation has ended.',
            });
            this.stopSessionTimer(sessionId);
            
            // ✅ Broadcast expert is now FREE again
            if (s.expert_id) {
              this.server.emit('expert_busy_changed', {
                expert_id: s.expert_id,
                is_busy: false,
              });
              this.notifyExpertStatusUpdate(
                s.expert_id,
                'call_ended',
                s,
              );
            }
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
      const session = await this.callFacade.end(payload.sessionId);
      this.stopSessionTimer(payload.sessionId);
      this.server.to(`call_room_${payload.sessionId}`).emit('call_ended', session);
      return { status: 'ended' };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to end call sessionId=${payload.sessionId}`,
        error,
      );
      return { status: 'error', message: (error as Error).message };
    }
  }

  @SubscribeMessage('confirm_paid_continuation')
  async handleConfirmContinuation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    try {
      const session = await this.callFacade.convertToPaid(payload.sessionId);
      this.server
        .to(`call_room_${payload.sessionId}`)
        .emit('continuation_confirmed', {
          message:
            'Continuation confirmed. Call will continue as a paid session.',
          session,
        });
      return { status: 'success' };
    } catch (error: unknown) {
      return { status: 'error', message: (error as Error).message };
    }
  }
}
