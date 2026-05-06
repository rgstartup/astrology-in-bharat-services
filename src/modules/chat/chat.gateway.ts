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
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ChatFacade } from './application/chat.facade';
import { MessageType } from './infrastructure/persistence/entities/chat-message.entity';
import { ChatSessionStatus } from './infrastructure/persistence/entities/chat-session.entity';
import { WalletFacade } from '@/modules/wallet/application/wallet.facade';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private sessionTimers = new Map<number, NodeJS.Timeout>();
  private expertSockets = new Map<number, string>(); // expertId -> socketId

  constructor(
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    private readonly walletFacade: WalletFacade,
  ) { }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from chat: ${client.id}`);
    // Remove from expert map if exists
    for (const [expertId, socketId] of this.expertSockets.entries()) {
      if (socketId === client.id) {
        this.expertSockets.delete(expertId);
        this.logger.log(`Expert ${expertId} unregistered due to disconnect`);
        break;
      }
    }
  }

  @SubscribeMessage('register_expert')
  handleRegisterExpert(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { expertId: number },
  ) {
    
    this.expertSockets.set(payload.expertId, client.id);
    client.join(`expert_${payload.expertId}`); // Join a private notification room
    this.logger.log(
      `Expert ${payload.expertId} registered and joined expert_${payload.expertId}`,
    );
    
    return { status: 'registered' };
  }

  async getWalletBalance(userId: number): Promise<number> {
    return this.walletFacade.getBalance(userId);
  }

  async getWallet(userId: number) {
    return this.walletFacade.getWallet(userId);
  }

  notifyExpertNewRequest(expertId: number, session: any) {
    
    this.server.to(`expert_${expertId}`).emit('new_chat_request', session);
    this.logger.log(
      `Notified expert room expert_${expertId} of new session ${session.id}`,
    );
  }

  /**
   * Notify an expert's dashboard about any session status change
   */
  notifyExpertStatusUpdate(
    expertId: number,
    event: 'session_activated' | 'session_ended',
    data: any,
  ) {
    
    this.server.to(`expert_${expertId}`).emit(event, data);
    this.logger.log(
      `Status update ${event} sent to expert room expert_${expertId}`,
    );
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number },
  ) {
    const session = await this.chatFacade.getSession(payload.sessionId);
    if (!session) {
      return { status: 'error', message: 'Session not found' };
    }

    if (
      session.status === ChatSessionStatus.COMPLETED ||
      session.status === ChatSessionStatus.EXPIRED
    ) {
    
      return {
        status: 'error',
        message: `Session is already ${session.status}`,
      };
    }

    client.join(`room_${payload.sessionId}`);
    this.logger.log(`Client ${client.id} joined room_${payload.sessionId}`);
    return { status: 'joined' };
  }

  @SubscribeMessage('activate_session')
  async handleActivateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number },
  ) {
    const { session, introCard } = await this.chatFacade.activateSession(
      payload.sessionId,
    );

    // Calculate initial timer values for immediate sync
    const wallet = await this.walletFacade.getWallet(session.user_id);
    const totalAffordableBalance = Number(wallet.balance) + Number(wallet.reserved_balance);
    const price = session.price_per_minute || 0;

    const maxMinutes = session.is_free
      ? session.free_minutes
      : price > 0
        ? Math.floor(totalAffordableBalance / price)
        : 0;

    const serverTime = new Date();
    const startTime = session.start_time
      ? new Date(session.start_time)
      : serverTime;
    const currentElapsed = Math.max(
      0,
      Math.floor((serverTime.getTime() - startTime.getTime()) / 1000),
    );

    const totalAllowedSeconds = maxMinutes * 60;

    const dataWithTimers = {
      ...session,
      startedAt: startTime,
      expiresAt: new Date(startTime.getTime() + totalAllowedSeconds * 1000),
      serverTime,
      remainingSeconds: Math.max(0, totalAllowedSeconds - currentElapsed),
      elapsedSeconds: currentElapsed,
    };

    this.server
      .to(`room_${payload.sessionId}`)
      .emit('session_activated', dataWithTimers);

    // ✅ Broadcast Intro Card if it exists
    if (introCard) {
      this.server.to(`room_${payload.sessionId}`).emit('new_message', introCard);
    }

    // Notify expert dashboard directly
    if (session.expert_id) {
      this.notifyExpertStatusUpdate(
        session.expert_id,
        'session_activated',
        dataWithTimers,
      );
    }

    // Clear existing timer if any
    if (this.sessionTimers.has(payload.sessionId)) {
      clearInterval(this.sessionTimers.get(payload.sessionId));
    }

    // Start a timer that checks balance every minute
    const timer = setInterval(async () => {
      const currentSession = await this.chatFacade.getSession(
        payload.sessionId,
      );
      if (
        !currentSession ||
        currentSession.status !== ChatSessionStatus.ACTIVE
      ) {
        clearInterval(timer);
        this.sessionTimers.delete(payload.sessionId);
        return;
      }

      const now = new Date();
      const durationMs = now.getTime() - currentSession.start_time.getTime();
      const durationMins = Math.floor(durationMs / 60000);

      // 1. Handle Free Session Expiry
      if (
        currentSession.is_free &&
        durationMins >= currentSession.free_minutes &&
        !currentSession.metadata?.free_limit_triggered
      ) {
        const balance = await this.walletFacade.getBalance(
          currentSession.user_id,
        );
        const minReq = currentSession.price_per_minute * 5;

        // Mark as triggered in metadata to avoid multiple emits
        await this.chatFacade.updateSessionMetadata(payload.sessionId, {
          ...currentSession.metadata,
          free_limit_triggered: true,
        });

        this.server.to(`room_${payload.sessionId}`).emit('free_time_ending_soon', {
          message:
            balance < minReq
              ? 'Your free session is ending soon. Please recharge to continue.'
              : `Your free session has ended. To continue at ₹${currentSession.price_per_minute}/min, please confirm.`,
          requireRecharge: balance < minReq,
          expertPrice: currentSession.price_per_minute,
          balance,
        });

        // Set a 30s grace period to confirm or end
        setTimeout(async () => {
          const s = await this.chatFacade.getSession(payload.sessionId);
          // If still active but no reservation done (we'd need a flag or just check balance again)
          // For now, if they don't have balance after 30s, end it.
          const b = await this.walletFacade.getBalance(currentSession.user_id);
          if (b < minReq && s?.status === ChatSessionStatus.ACTIVE) {
            const summary = await this.chatFacade.endChat(payload.sessionId);
            this.server
              .to(`room_${payload.sessionId}`)
              .emit('session_ended', { ...summary, reason: 'free_limit_ended_no_balance' });
          }
        }, 30000);
      }

      // 2. Handle Continuous Paid Balance Check (beyond initial 5 mins if not free)
      const checkThreshold = currentSession.is_free
        ? currentSession.free_minutes + 1
        : 5;
      if (durationMins >= checkThreshold) {
        const balance = await this.walletFacade.getBalance(
          currentSession.user_id,
        );
        if (balance < currentSession.price_per_minute) {
          this.server.to(`room_${payload.sessionId}`).emit('balance_warning', {
            message: 'Insufficient balance. Session will end in 30 seconds.',
          });

          setTimeout(async () => {
            const s = await this.chatFacade.getSession(payload.sessionId);
            if (s?.status === ChatSessionStatus.ACTIVE) {
              const summary = await this.chatFacade.endChat(payload.sessionId);
              this.server
                .to(`room_${payload.sessionId}`)
                .emit('session_ended', { ...summary, reason: 'insufficient_balance' });
            }
          }, 30000);
        }
      }
    }, 60000);

    this.sessionTimers.set(payload.sessionId, timer);
    return session;
  }

  @SubscribeMessage('confirm_paid_continuation')
  async handleConfirmContinuation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number },
  ) {
    try {
      const session = await this.chatFacade.convertToPaid(payload.sessionId);
      this.server
        .to(`room_${payload.sessionId}`)
        .emit('continuation_confirmed', {
          message:
            'Continuation confirmed. Chat will continue as a paid session.',
          session,
        });
      return { status: 'success' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      sessionId: number;
      senderId: number;
      senderType: 'user' | 'expert';
      content: string;
      type?: MessageType;
    },
  ) {
    // Validation: Only allow messages if session is active
    const session = await this.chatFacade.getSession(payload.sessionId);
    if (!session || session.status !== ChatSessionStatus.ACTIVE) {
      
      return { status: 'error', message: 'Chat is not active' };
    }

    const savedMsg = await this.chatFacade.saveMessage(
      payload.sessionId,
      payload.senderId,
      payload.senderType,
      payload.content,
      payload.type || MessageType.TEXT,
    );

    this.server.to(`room_${payload.sessionId}`).emit('new_message', savedMsg);
    return savedMsg;
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: number },
  ) {
    
    const session = await this.chatFacade.endChat(payload.sessionId);

    // Broadcast to the room so BOTH User and Expert know immediately
    this.server.to(`room_${payload.sessionId}`).emit('session_ended', session);
    

    // Notify expert dashboard directly (if they are in dashboard view)
    if (session && session.expert_id) {
      this.notifyExpertStatusUpdate(session.expert_id, 'session_ended', session);
    }

    if (this.sessionTimers.has(payload.sessionId)) {
      clearInterval(this.sessionTimers.get(payload.sessionId));
      this.sessionTimers.delete(payload.sessionId);
    }

    return session;
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { sessionId: number; senderName: string; isTyping: boolean },
  ) {
    client.to(`room_${payload.sessionId}`).emit('typing_status', payload);
  }

  @SubscribeMessage('admin_terminate_session')
  async handleAdminTerminateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      sessionId: number;
      adminId: number;
      userMessage?: string;
      expertMessage?: string;
    },
  ) {
    try {
      const session = await this.chatFacade.adminTerminateSession(
        payload.sessionId,
        payload.adminId,
        payload.userMessage,
        payload.expertMessage,
      );
      return { status: 'success', session };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}
