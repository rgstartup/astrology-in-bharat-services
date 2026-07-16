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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatFacade } from './application/chat.facade';
import { MessageType } from './infrastructure/entities/chat-message.entity';
import {
  ChatSessionStatus,
  ChatSession,
} from './infrastructure/entities/chat-session.entity';
import { WalletFacade } from '@/modules/finance/wallet/application/wallet.facade';

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
  private sessionTimers = new Map<string, NodeJS.Timeout>();
  private expertSockets = new Map<string, string>(); // expert_id -> socketId
  private disconnectTimers = new Map<string, NodeJS.Timeout>(); // expert_id -> timeout
  private socketToSession = new Map<string, string>(); // socketId -> sessionId
  private sessionDisconnectTimeouts = new Map<string, NodeJS.Timeout>(); // sessionId -> timeout

  constructor(
    @Inject(forwardRef(() => ChatFacade))
    private readonly chatFacade: ChatFacade,
    @Inject(forwardRef(() => WalletFacade))
    private readonly walletFacade: WalletFacade,
    @InjectRepository(ChatSession)
    private readonly sessionRepo: Repository<ChatSession>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from chat: ${client.id}`);

    // Auto-disconnect logic for sessions (Grace period 30s)
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      this.logger.log(`[ChatGateway] Socket ${client.id} belonged to active session ${sessionId}. Starting 30s auto-end timer.`);
      const timeout = setTimeout(async () => {
        try {
          const session = await this.chatFacade.getSession(sessionId);
          if (session && session.status === ChatSessionStatus.ACTIVE) {
            this.logger.warn(`[ChatGateway] ⏱️ 30s grace period expired for chat session ${sessionId}. Auto-ending chat.`);
            const summary = await this.chatFacade.endChat(sessionId);
            this.server.to(`room_${sessionId}`).emit('session_ended', {
              ...summary,
              reason: 'socket_disconnected',
              message: 'Chat ended due to lost connection.',
            });
            if (this.sessionTimers.has(sessionId)) {
              clearInterval(this.sessionTimers.get(sessionId));
              this.sessionTimers.delete(sessionId);
            }
          }
        } catch (e) {
          this.logger.error(`[ChatGateway] Failed to auto-end session ${sessionId}`, e);
        }
        this.sessionDisconnectTimeouts.delete(sessionId);
      }, 30000); // 30 seconds
      this.sessionDisconnectTimeouts.set(sessionId, timeout);
      this.socketToSession.delete(client.id);
    }

    // Remove from expert map if exists
    for (const [expert_id, socketId] of this.expertSockets.entries()) {
      if (socketId === client.id) {
        this.expertSockets.delete(expert_id);
        this.logger.log(`Expert ${expert_id} unregistered due to disconnect`);
        
        // Start a 15-second timer to end their active chats if they don't reconnect
        const timer = setTimeout(async () => {
          this.logger.log(`Expert ${expert_id} did not reconnect in 15s. Ending their active chats.`);
          try {
            const activeSessions = await this.sessionRepo.find({
              where: { expert_id, status: ChatSessionStatus.ACTIVE }
            });
            for (const session of activeSessions) {
              await this.chatFacade.endChat(session.id);
              this.logger.log(`Ended active session ${session.id} due to expert disconnect timeout.`);
            }
          } catch (error) {
            this.logger.error(`Error ending active chats for expert ${expert_id}:`, error);
          }
          this.disconnectTimers.delete(expert_id);
        }, 15000);
        
        this.disconnectTimers.set(expert_id, timer);
        break;
      }
    }
  }

  @SubscribeMessage('register_expert')
  handleRegisterExpert(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { expert_id: string },
  ) {
    this.expertSockets.set(payload.expert_id, client.id);
    void client.join(`expert_${payload.expert_id}`); // Join a private notification room
    this.logger.log(
      `Expert ${payload.expert_id} registered and joined expert_${payload.expert_id}`,
    );

    if (this.disconnectTimers.has(payload.expert_id)) {
      clearTimeout(this.disconnectTimers.get(payload.expert_id)!);
      this.disconnectTimers.delete(payload.expert_id);
      this.logger.log(`Expert ${payload.expert_id} reconnected. Cancelled disconnect timer.`);
    }

    return { status: 'registered' };
  }

  @SubscribeMessage('force_end_active_chats')
  async handleForceEndActiveChats(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { expert_id: string },
  ) {
    this.logger.log(`Received force_end_active_chats for expert ${payload.expert_id}`);
    try {
      const activeSessions = await this.sessionRepo.find({
        where: { expert_id: payload.expert_id, status: ChatSessionStatus.ACTIVE }
      });
      for (const session of activeSessions) {
        await this.chatFacade.endChat(session.id);
        this.logger.log(`Ended active session ${session.id} due to explicit offline toggle.`);
      }
    } catch (error) {
      this.logger.error(`Error ending active chats for expert ${payload.expert_id} on force end:`, error);
    }
  }

  async getWalletBalance(profileId: string): Promise<number> {
    return this.walletFacade.getBalance(profileId, 'client_id');
  }

  async getWallet(
    profileId: string,
    walletKey:
      | 'client_id'
      | 'expert_id'
      | 'merchant_id'
      | 'agent_id' = 'client_id',
  ) {
    return this.walletFacade.getWallet(profileId, walletKey);
  }

  notifyExpertNewRequest(expert_id: string, session: ChatSession) {
    this.server.to(`expert_${expert_id}`).emit('new_chat_request', session);
    this.logger.log(
      `Notified expert room expert_${expert_id} of new session ${session.id}`,
    );
  }

  /**
   * Notify an expert's dashboard about any session status change
   */
  notifyExpertStatusUpdate(
    expert_id: string,
    event: 'session_activated' | 'session_ended',
    data: unknown,
  ) {
    this.server.to(`expert_${expert_id}`).emit(event, data);
    this.logger.log(
      `Status update ${event} sent to expert room expert_${expert_id}`,
    );
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
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

    void client.join(`room_${payload.sessionId}`);
    this.logger.log(`Client ${client.id} joined room_${payload.sessionId}`);

    // Track for auto-disconnect
    this.socketToSession.set(client.id, payload.sessionId);

    // Clear any existing session disconnect timeout if they reconnected in time
    if (this.sessionDisconnectTimeouts.has(payload.sessionId)) {
      this.logger.log(`[ChatGateway] 🔄 User reconnected to chat session ${payload.sessionId}. Cleared auto-end timer.`);
      clearTimeout(this.sessionDisconnectTimeouts.get(payload.sessionId));
      this.sessionDisconnectTimeouts.delete(payload.sessionId);
    }

    return { status: 'joined' };
  }

  public async activateSession(
    sessionId: string,
    sessionData?: Partial<ChatSession>,
    introCardData?: unknown,
  ) {
    let session = sessionData;
    let introCard = introCardData;

    if (!session) {
      const result = await this.chatFacade.activateSession(sessionId);
      session = result.session;
      introCard = result.introCard;
    }

    if (!session) return null;

    // Calculate initial timer values for immediate sync
    const wallet = await this.walletFacade.getWallet(
      session.client_id!,
      'client_id',
    );
    const totalAffordableBalance =
      Number(wallet.balance) + Number(wallet.reserved_balance);
    const price = session.price_per_minute || 0;

    const maxMinutes = session.is_free
      ? session.free_minutes
      : price > 0
        ? Math.floor(totalAffordableBalance / price)
        : 60; // fallback 60 mins if price is 0

    console.log(`[ChatGateway] activateSession Debug:`, {
      sessionId,
      is_free: session.is_free,
      free_minutes: session.free_minutes,
      price,
      totalAffordableBalance,
      maxMinutes,
    });

    const serverTime = new Date();
    const startTime = session.start_time
      ? new Date(session.start_time)
      : serverTime;
    const currentElapsed = Math.max(
      0,
      Math.floor((serverTime.getTime() - startTime.getTime()) / 1000),
    );

    const totalAllowedSeconds = (maxMinutes ?? 60) * 60;

    const dataWithTimers = {
      ...session,
      startedAt: startTime,
      expiresAt: new Date(startTime.getTime() + totalAllowedSeconds * 1000),
      serverTime,
      remainingSeconds: Math.max(0, totalAllowedSeconds - currentElapsed),
      elapsedSeconds: currentElapsed,
    };

    this.server
      .to(`room_${sessionId}`)
      .emit('session_activated', dataWithTimers);

    // ✅ Broadcast expert is now BUSY (blocks new requests on user-facing listing cards)
    this.server.emit('expert_busy_changed', {
      expert_id: session.expert_id,
      is_busy: true,
    });

    // ✅ Broadcast Intro Card if it exists
    if (introCard) {
      this.server.to(`room_${sessionId}`).emit('new_message', introCard);
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
    if (this.sessionTimers.has(sessionId)) {
      clearInterval(this.sessionTimers.get(sessionId));
    }

    // Start a timer that checks balance every minute
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const timer = setInterval(async () => {
      const currentSession = await this.chatFacade.getSession(sessionId);
      if (
        !currentSession ||
        currentSession.status !== ChatSessionStatus.ACTIVE
      ) {
        clearInterval(timer);
        this.sessionTimers.delete(sessionId);
        return;
      }

      const now = new Date();
      const durationMs = now.getTime() - currentSession.start_time.getTime();
      const durationMins = Math.floor(durationMs / 60000);

      // Hard Limit: End any chat over 60 minutes
      if (durationMins >= 60) {
        this.logger.warn(`[ChatGateway] Session ${sessionId} reached 1 hour max limit. Force ending.`);
        const summary = await this.chatFacade.endChat(sessionId);
        this.server.to(`room_${sessionId}`).emit('session_ended', {
          ...summary,
          reason: 'max_duration_reached',
          message: 'Maximum chat duration of 1 hour reached.',
        });
        clearInterval(timer);
        this.sessionTimers.delete(sessionId);
        return;
      }

      // 1. Handle Free Session Expiry
      if (
        currentSession.is_free &&
        durationMins >= currentSession.free_minutes &&
        !currentSession.metadata?.free_limit_triggered
      ) {
        const balance = await this.walletFacade.getBalance(
          currentSession.client_id,
          'client_id',
        );
        const minReq = currentSession.price_per_minute * 5;

        // Mark as triggered in metadata to avoid multiple emits
        await this.chatFacade.updateSessionMetadata(sessionId, {
          ...currentSession.metadata,
          free_limit_triggered: true,
        });

        this.server.to(`room_${sessionId}`).emit('free_time_ending_soon', {
          message:
            balance < minReq
              ? 'Your free session is ending soon. Please recharge to continue.'
              : `Your free session has ended. To continue at ₹${currentSession.price_per_minute}/min, please confirm.`,
          requireRecharge: balance < minReq,
          expertPrice: currentSession.price_per_minute,
          balance,
        });

        // Set a 30s grace period to confirm or end
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        setTimeout(async () => {
          const s = await this.chatFacade.getSession(sessionId);
          // If still active but no reservation done (we'd need a flag or just check balance again)
          // For now, if they don't have balance after 30s, end it.
          const b = await this.walletFacade.getBalance(
            currentSession.client_id,
            'client_id',
          );
          if (b < minReq && s?.status === ChatSessionStatus.ACTIVE) {
            const summary = await this.chatFacade.endChat(sessionId);
            this.server.to(`room_${sessionId}`).emit('session_ended', {
              ...summary,
              reason: 'free_limit_ended_no_balance',
            });
          }
        }, 30000);
      }

      // 2. Handle Continuous Paid Balance Check (beyond initial 5 mins if not free)
      const checkThreshold = currentSession.is_free
        ? currentSession.free_minutes + 1
        : 5;
      if (durationMins >= checkThreshold) {
        const balance = await this.walletFacade.getBalance(
          currentSession.client_id,
          'client_id',
        );
        if (balance < currentSession.price_per_minute) {
          this.server.to(`room_${sessionId}`).emit('balance_warning', {
            message: 'Insufficient balance. Session will end in 30 seconds.',
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          setTimeout(async () => {
            const s = await this.chatFacade.getSession(sessionId);
            if (s?.status === ChatSessionStatus.ACTIVE) {
              const summary = await this.chatFacade.endChat(sessionId);
              this.server.to(`room_${sessionId}`).emit('session_ended', {
                ...summary,
                reason: 'insufficient_balance',
              });
            }
          }, 30000);
        }
      }
    }, 10000);

    this.sessionTimers.set(sessionId, timer);
    return dataWithTimers;
  }

  @SubscribeMessage('activate_session')
  async handleActivateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    await this.activateSession(payload.sessionId);
  }

  @SubscribeMessage('confirm_paid_continuation')
  async handleConfirmContinuation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
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
    } catch (error: unknown) {
      return { status: 'error', message: (error as Error).message };
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      sessionId: string;
      senderId: string;
      senderType: 'user' | 'expert';
      content: string;
      type?: MessageType;
      attachmentUrl?: string;
      attachmentType?: string;
    },
  ) {
    console.log(`[ChatGateway] Received send_message from ${payload.senderType} (${payload.senderId}) for room_${payload.sessionId}. Payload:`, payload);
    // Validation: Only allow messages if session is active
    const session = await this.chatFacade.getSession(payload.sessionId);
    if (!session || session.status !== ChatSessionStatus.ACTIVE) {
      console.log(`[ChatGateway] Chat is not active for session ${payload.sessionId}. Status: ${session?.status}`);
      return { status: 'error', message: 'Chat is not active' };
    }

    try {
      const savedMsg = await this.chatFacade.saveMessage(
        payload.sessionId,
        payload.senderId,
        payload.senderType,
        payload.content,
        payload.type || MessageType.TEXT,
        payload.attachmentUrl,
        payload.attachmentType,
      );
      
      console.log(`[ChatGateway] Message saved successfully. Emitting new_message to room_${payload.sessionId}...`, savedMsg);

      // Use client to ensure we are emitting in the correct namespace
      // client.to(room) emits to everyone in the room EXCEPT the sender
      client.to(`room_${payload.sessionId}`).emit('new_message', savedMsg);
      // client.emit sends to the sender themselves
      client.emit('new_message', savedMsg);
      
      console.log(`[ChatGateway] Broadcast complete for message ${savedMsg.id}`);
      return savedMsg;
    } catch (error) {
      console.error(`[ChatGateway] Error saving message:`, error);
      return { status: 'error', message: 'Error saving message' };
    }
  }

  @SubscribeMessage('end_chat')
  async handleEndChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const session = await this.chatFacade.endChat(payload.sessionId);

    // Broadcast to the room so BOTH User and Expert know immediately
    this.server.to(`room_${payload.sessionId}`).emit('session_ended', session);

    // ✅ Broadcast expert is now FREE again
    if (session && session.expert_id) {
      this.server.emit('expert_busy_changed', {
        expert_id: session.expert_id,
        is_busy: false,
      });
    }

    // Notify expert dashboard directly (if they are in dashboard view)
    if (session && session.expert_id) {
      this.notifyExpertStatusUpdate(
        session.expert_id,
        'session_ended',
        session,
      );
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
    payload: { sessionId: string; senderName: string; isTyping: boolean },
  ) {
    client.to(`room_${payload.sessionId}`).emit('typing_status', payload);
  }

  @SubscribeMessage('admin_terminate_session')
  async handleAdminTerminateSession(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      sessionId: string;
      adminId: string;
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
    } catch (error: unknown) {
      return { status: 'error', message: (error as Error).message };
    }
  }
}
