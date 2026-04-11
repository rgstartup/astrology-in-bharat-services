import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Header,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ChatFacade } from '../../application/chat.facade';
import { ExpertSessionFilter } from '../../application/use-cases/find-expert-sessions.use-case';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ChatGateway } from '../../chat.gateway';
import { ChatSessionStatus } from '../../infrastructure/persistence/entities/chat-session.entity';
import { InitiateChatDto } from '../dto/initiate-chat.dto';

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
    @Body() dto: InitiateChatDto,
  ) {
    const session = await this.chatFacade.initiateChat(user.id, dto.expertId, dto.metadata);

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
    const { session, introCard } = await this.chatFacade.activateSession(sessionId);
    if (session) {
      const enrichedSession = await this.enrichSessionTimers(session);

      // Notify the specific chat room
      this.chatGateway.server
        .to(`room_${sessionId}`)
        .emit('session_activated', enrichedSession);
      
      // Notify about intro card if created
      if (introCard) {
        this.chatGateway.server
          .to(`room_${sessionId}`)
          .emit('new_message', introCard);
      }

      // Notify the expert's dashboard room
      this.chatGateway.notifyExpertStatusUpdate(
        session.expert_id,
        'session_activated',
        enrichedSession,
      );
      return enrichedSession;
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

  @Patch('session/:sessionId/status')
  async updateStatus(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body('status') status: string,
  ) {
    
    
    if (status === 'accepted') {
        const { session, introCard } = await this.chatFacade.activateSession(sessionId);
        if (session) {
            const enrichedSession = await this.enrichSessionTimers(session);
            this.chatGateway.server.to(`room_${sessionId}`).emit('session_activated', enrichedSession);
            
            if (introCard) {
                this.chatGateway.server.to(`room_${sessionId}`).emit('new_message', introCard);
            }

            this.chatGateway.notifyExpertStatusUpdate(session.expert_id, 'session_activated', enrichedSession);
            return enrichedSession;
        }
        return session;
    }

    if (status === 'rejected' || status === 'cancelled') {
        const session = await this.chatFacade.expireSession(sessionId); // Or similar logic for manual rejection
        if (session) {
            this.chatGateway.server.to(`room_${sessionId}`).emit('session_ended', { status: 'rejected', id: sessionId });
            this.chatGateway.notifyExpertStatusUpdate(session.expert_id, 'session_ended', { status: 'rejected', id: sessionId });
        }
        return session;
    }

    return { success: false, message: 'Invalid status update for chat' };
  }

  @Get('session/:sessionId')
  @Header('Cache-Control', 'no-store')
  async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const session = await this.chatFacade.getSession(sessionId);
    if (!session) return null;

    return this.enrichSessionTimers(session);
  }

  @Get('history/:sessionId')
  getHistory(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.chatFacade.getHistory(sessionId);
  }

  /**
   * User-facing endpoint: GET /api/v1/chat/user-session/:expertId?sessionId=<id>
   * Returns { success, expert, session } shape expected by the client chat room page.
   */
  @Get('user-session/:expertId')
  @Header('Cache-Control', 'no-store')
  async getUserSession(
    @Param('expertId', ParseIntPipe) expertId: number,
    @Query('sessionId') sessionIdStr?: string,
  ) {
    let session: any;

    if (sessionIdStr) {
      const sessionId = parseInt(sessionIdStr, 10);
      session = await this.chatFacade.getSession(sessionId);
    }

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const enrichedSession = await this.enrichSessionTimers(session);

    // Build the expert object in the shape the frontend Astrologer type expects
    const expert = session.expert
      ? {
          id: session.expert.id,
          name: session.expert.user?.name || '',
          image: session.expert.user?.avatar || '/images/dummy-astrologer.jpg',
          expertise: session.expert.specialization || '',
          language: session.expert.languages || '',
          experience: session.expert.experience || 0,
          ratings: session.expert.rating || 0,
          price: session.expert.price_per_minute || 0,
          is_available: session.expert.is_available || false,
          video: session.expert.intro_video || null,
          total_likes: session.expert.total_likes || 0,
        }
      : null;

    // Build session object in the shape the frontend expects
    const sessionData = {
      id: enrichedSession.id,
      status: enrichedSession.status,
      isFree: enrichedSession.is_free,
      freeMinutes: enrichedSession.free_minutes,
      messages: [],  // Will be populated via socket events
      expiresAt: enrichedSession.expiresAt,
      startedAt: enrichedSession.startedAt,
      expires_at: enrichedSession.expiresAt,
      started_at: enrichedSession.startedAt,
      remainingSeconds: enrichedSession.remainingSeconds,
      elapsedSeconds: enrichedSession.elapsedSeconds,
    };

    return {
      success: true,
      expert,
      session: sessionData,
    };
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
        // Calculate precise duration string
        let durationString = '0s';
        if (session.start_time && session.end_time) {
          const start = new Date(session.start_time);
          const end = new Date(session.end_time);
          const diffMs = end.getTime() - start.getTime();
          const totalSeconds = Math.floor(diffMs / 1000);
          const mins = Math.floor(totalSeconds / 60);
          const secs = totalSeconds % 60;
          durationString = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        }

        // Return optimized lean object
        return {
          id: session.id,
          created_at: session.created_at,
          start_time: session.start_time,
          end_time: session.end_time,
          status: session.status,
          total_cost: session.total_cost,
          session_type: session.session_type,
          is_free: session.is_free,
          terminated_by: session.terminated_by,
          durationString,
          expert: {
            id: session.expert?.id,
            specialization: session.expert?.specialization,
            rating: session.expert?.rating,
            user: {
              name: session.expert?.user?.name,
              avatar: session.expert?.user?.avatar,
            },
          },
        };
      }),
    );
  }

  @Get('sessions/active-client')
  @Header('Cache-Control', 'no-store')
  async getActiveClientSession(@CurrentUser() user: User) {
    const session = await this.chatFacade.getActiveClientSession(user.id);
    if (!session) return null;

    return this.enrichSessionTimers(session);
  }

  private async enrichSessionTimers(session: any): Promise<any> {
    if (!session) return session;

    const expiryTimeMs = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );
    const serverTime = new Date();
    const createdAt = new Date(session.created_at);
    let expiresAt = new Date(createdAt.getTime() + expiryTimeMs);
    let startedAt = session.start_time ? new Date(session.start_time) : null;

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
      
      expiresAt = new Date(startTime.getTime() + totalAllowedSeconds * 1000);
      startedAt = startTime;
    }

    const sessionObj = typeof session.toJSON === 'function' ? session.toJSON() : session;
    return {
      ...sessionObj,
      expiresAt,
      startedAt,
      serverTime,
      remainingSeconds,
      elapsedSeconds,
    };
  }
}
