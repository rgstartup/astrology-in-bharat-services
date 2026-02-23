import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Header,
} from '@nestjs/common';
import { ChatFacade } from '../../application/chat.facade';
import { ExpertSessionFilter } from '../../application/use-cases/find-expert-sessions.use-case';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ChatGateway } from '../../chat.gateway';
import { ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';

@Controller({
  path: 'chat',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatFacade: ChatFacade,
    private readonly chatGateway: ChatGateway,
  ) { }

  @Post('initiate')
  async initiateChat(
    @CurrentUser() user: User,
    @Body('expertId', ParseIntPipe) expertId: number,
  ) {
    const session = await this.chatFacade.initiateChat(user.id, expertId);

    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );
    const expiryMinutes = Math.ceil(expiryTime / 60000);

    const expiresAt = new Date(Date.now() + expiryTime);

    // Calculate affordable minutes for paid chat or use freeMinutes
    let maxMinutes = session.is_free ? session.free_minutes : 0;
    if (!session.is_free && session.price_per_minute > 0) {
      const balance = await this.chatGateway.getWalletBalance(user.id);
      maxMinutes = Math.floor(balance / session.price_per_minute);
    }

    const sessionWithExpiry = { ...session, expiresAt, maxMinutes };

    // Notify expert with the full session object (including expiresAt and maxMinutes)
    this.chatGateway.notifyExpertNewRequest(expertId, sessionWithExpiry);

    setTimeout(async () => {
      const expiredSession = await this.chatFacade.expireSession(session.id);
      if (expiredSession) {
        // If it was actually expired (was still pending), notify users
        this.chatGateway.server.to(`room_${session.id}`).emit('session_ended', {
          status: 'expired',
          id: session.id,
          message: `Session expired as expert did not join within ${expiryMinutes} minutes.`,
        });
        // Also notify expert's dashboard room
        this.chatGateway.notifyExpertStatusUpdate(
          session.expert_id,
          'session_ended',
          {
            status: 'expired',
            id: session.id,
          },
        );
      }
    }, expiryTime);

    return sessionWithExpiry;
  }

  @Post('activate/:sessionId')
  async activateSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const session = await this.chatFacade.activateSession(sessionId);
    if (session) {
      // Notify the specific chat room
      this.chatGateway.server
        .to(`room_${sessionId}`)
        .emit('session_activated', session);
      // Notify the expert's dashboard room
      this.chatGateway.notifyExpertStatusUpdate(
        session.expert_id,
        'session_activated',
        session,
      );
    }
    return session;
  }

  @Post('end/:sessionId')
  async endChat(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const session = await this.chatFacade.endChat(sessionId);
    if (session) {
      // Notify the specific chat room
      this.chatGateway.server
        .to(`room_${sessionId}`)
        .emit('session_ended', session);
      // Notify the expert's dashboard room
      this.chatGateway.notifyExpertStatusUpdate(
        session.expert_id,
        'session_ended',
        session,
      );
    }
    return session;
  }

  @Get('session/:sessionId')
  @Header('Cache-Control', 'no-store')
  async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const session = await this.chatFacade.getSession(sessionId);
    if (!session) return null;

    const expiryTimeMs = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );
    const serverTime = new Date();
    const createdAt = new Date(session.created_at);
    const expiresAt = new Date(createdAt.getTime() + expiryTimeMs);

    // Timer Logic
    let remainingSeconds = 0;
    let elapsedSeconds = 0;

    if (session.status === ChatSessionStatus.PENDING) {
      remainingSeconds = Math.max(
        0,
        Math.floor((expiresAt.getTime() - serverTime.getTime()) / 1000),
      );
    } else if (
      session.status === ChatSessionStatus.ACTIVE &&
      session.start_time
    ) {
      const startTime = new Date(session.start_time);
      elapsedSeconds = Math.max(
        0,
        Math.floor((serverTime.getTime() - startTime.getTime()) / 1000),
      );

      // CRITICAL: Get full potential balance (current + reserved for this session)
      const wallet = await this.chatGateway.getWallet(session.user_id);
      const totalAffordableBalance =
        Number(wallet.balance) + Number(wallet.reserved_balance);
      const price = session.price_per_minute || 0;

      const maxMinutes = session.is_free
        ? session.free_minutes
        : price > 0
          ? Math.floor(totalAffordableBalance / price)
          : 0;

      const totalAllowedSeconds = maxMinutes * 60;
      remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);
    }

    return {
      ...session,
      expiresAt,
      serverTime, // Sending server time for client sync
      remainingSeconds,
      elapsedSeconds,
    };
  }

  @Get('history/:sessionId')
  getHistory(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.chatFacade.getHistory(sessionId);
  }

  @Get('sessions/pending')
  @Header('Cache-Control', 'no-store')
  async getPendingSessions(@CurrentUser() user: User) {
    const sessions = await this.chatFacade.getExpertSessions(
      user.id,
      ExpertSessionFilter.PENDING,
    );
    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );

    return Promise.all(
      sessions.map(async (session) => {
        const userBalance =
          session.status === 'pending'
            ? await this.chatGateway.getWalletBalance(session.user_id)
            : 0;
        const maxMinutes = session.is_free
          ? session.free_minutes
          : session.price_per_minute > 0
            ? Math.floor(userBalance / session.price_per_minute)
            : 5; // Default 5 for paid if we don't have balance context

        return {
          ...session,
          expiresAt:
            session.status === 'pending'
              ? new Date(new Date(session.created_at).getTime() + expiryTime)
              : null,
          maxMinutes,
        };
      }),
    );
  }

  @Get('sessions/completed')
  @Header('Cache-Control', 'no-store')
  getCompletedSessions(@CurrentUser() user: User) {
    return this.chatFacade.getExpertSessions(user.id, ExpertSessionFilter.COMPLETED);
  }

  @Get('sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getRecentPendingSessions(@CurrentUser() user: User) {
    const sessions =
      await this.chatFacade.getExpertSessions(user.id, ExpertSessionFilter.RECENT_PENDING);
    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );

    return Promise.all(
      sessions.map(async (session) => {
        const userBalance =
          session.status === 'pending'
            ? await this.chatGateway.getWalletBalance(session.user_id)
            : 0;
        const maxMinutes = session.is_free
          ? session.free_minutes
          : session.price_per_minute > 0
            ? Math.floor(userBalance / session.price_per_minute)
            : 5;

        return {
          ...session,
          expiresAt:
            session.status === 'pending'
              ? new Date(new Date(session.created_at).getTime() + expiryTime)
              : null,
          maxMinutes,
        };
      }),
    );
  }

  @Get('sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  getRecentCompletedSessions(@CurrentUser() user: User) {
    return this.chatFacade.getExpertSessions(user.id, ExpertSessionFilter.RECENT_COMPLETED);
  }

  @Get('sessions/all')
  @Header('Cache-Control', 'no-store')
  async getAllSessions(@CurrentUser() user: User) {
    const sessions = await this.chatFacade.getExpertSessions(user.id, ExpertSessionFilter.ALL);
    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );

    return Promise.all(
      sessions.map(async (session) => {
        const userBalance =
          session.status === 'pending'
            ? await this.chatGateway.getWalletBalance(session.user_id)
            : 0;
        const maxMinutes = session.is_free
          ? session.free_minutes
          : session.price_per_minute > 0
            ? Math.floor(userBalance / session.price_per_minute)
            : 5;

        return {
          ...session,
          expiresAt:
            session.status === 'pending'
              ? new Date(new Date(session.created_at).getTime() + expiryTime)
              : null,
          maxMinutes,
        };
      }),
    );
  }

  @Get('sessions/my-sessions')
  @Header('Cache-Control', 'no-store')
  async getMySessionsAsClient(@CurrentUser() user: User) {
    const sessions = await this.chatFacade.getClientSessions(user.id);
    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );

    return Promise.all(
      sessions.map(async (session) => {
        const userBalance = await this.chatGateway.getWalletBalance(user.id);
        const maxMinutes = session.is_free
          ? session.free_minutes
          : session.price_per_minute > 0
            ? Math.floor(userBalance / session.price_per_minute)
            : 0;

        // Calculate durationMins from startTime and endTime
        let durationMins = 0;
        if (session.start_time && session.end_time) {
          const start = new Date(session.start_time);
          const end = new Date(session.end_time);
          const durationMs = end.getTime() - start.getTime();
          durationMins = Math.round(durationMs / 60000); // Convert ms to minutes
        }

        return {
          ...session,
          expiresAt:
            session.status === 'pending'
              ? new Date(new Date(session.created_at).getTime() + expiryTime)
              : null,
          maxMinutes,
          durationMins,
        };
      }),
    );
  }

  @Get('sessions/active-client')
  @Header('Cache-Control', 'no-store')
  async getActiveClientSession(@CurrentUser() user: User) {
    const session = await this.chatFacade.getActiveClientSession(user.id);
    if (!session) return null;

    const expiryTimeMs = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );
    const serverTime = new Date();

    let remainingSeconds = 0;
    let elapsedSeconds = 0;
    const expiresAt = new Date(
      new Date(session.created_at).getTime() + expiryTimeMs,
    );

    if (session.status === ChatSessionStatus.PENDING) {
      remainingSeconds = Math.max(
        0,
        Math.floor((expiresAt.getTime() - serverTime.getTime()) / 1000),
      );
    } else if (
      session.status === ChatSessionStatus.ACTIVE &&
      session.start_time
    ) {
      const startTime = new Date(session.start_time);
      elapsedSeconds = Math.max(
        0,
        Math.floor((serverTime.getTime() - startTime.getTime()) / 1000),
      );

      // CRITICAL: Get full potential balance (current + reserved for this session)
      const wallet = await this.chatGateway.getWallet(session.user_id);
      const totalAffordableBalance =
        Number(wallet.balance) + Number(wallet.reserved_balance);
      const price = session.price_per_minute || 0;

      const maxMinutes = session.is_free
        ? session.free_minutes
        : price > 0
          ? Math.floor(totalAffordableBalance / price)
          : 0;

      const totalAllowedSeconds = maxMinutes * 60;
      remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);
    }

    return {
      ...session,
      expiresAt,
      serverTime,
      remainingSeconds,
      elapsedSeconds,
    };
  }
}
