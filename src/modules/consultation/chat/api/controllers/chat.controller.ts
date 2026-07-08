import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Header,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ChatFacade } from '../../application/chat.facade';
import { ExpertSessionFilter } from '../../application/use-cases/find-expert-sessions.use-case';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { ChatGateway } from '../../chat.gateway';
import { ChatSessionStatus } from '../../infrastructure/entities/chat-session.entity';
import { InitiateChatDto } from '../dto/initiate-chat.dto';
import { GetExpertChatSessionsDto } from '../dto/get-expert-chat-sessions.dto';

@Controller({
  path: 'chat',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatFacade: ChatFacade,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post('initiate')
  async initiateChat(
    @CurrentProfile() clientId: string,
    @Body() dto: InitiateChatDto,
  ) {
    const session = await this.chatFacade.initiateChat(
      clientId,
      dto.expert_id,
      dto.metadata,
    );

    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );
    const expiryMinutes = Math.ceil(expiryTime / 60000);

    const expiresAt = new Date(Date.now() + expiryTime);

    // Calculate affordable minutes for paid chat or use freeMinutes
    let maxMinutes = session.is_free ? session.free_minutes : 0;
    if (!session.is_free && session.price_per_minute > 0) {
      const balance = await this.chatGateway.getWalletBalance(clientId);
      maxMinutes = Math.floor(balance / session.price_per_minute);
    }

    const sessionWithExpiry = { ...session, expiresAt, maxMinutes };

    // Notify expert with the full session object (including expiresAt and maxMinutes)
    this.chatGateway.notifyExpertNewRequest(dto.expert_id, sessionWithExpiry);

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
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
  async activateSession(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    const { session, introCard } =
      await this.chatFacade.activateSession(sessionId);
    if (session) {
      const enrichedSession = await this.enrichSessionTimers(
        session as unknown as Record<string, unknown>,
      );

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
  async endChat(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
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
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('status') status: string,
  ) {
    if (status === 'accepted') {
      const { session, introCard } =
        await this.chatFacade.activateSession(sessionId);
      if (session) {
        const enrichedSession = await this.chatGateway.activateSession(
          sessionId,
          session,
          introCard,
        );
        const res = enrichedSession || session;
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          'data' in res
        ) {
          const rest = { ...(res as Record<string, unknown>) };
          delete rest['data'];
          return rest;
        }
        return res;
      }
      return session;
    }

    if (status === 'rejected' || status === 'cancelled') {
      const session = await this.chatFacade.expireSession(sessionId); // Or similar logic for manual rejection
      if (session) {
        this.chatGateway.server
          .to(`room_${sessionId}`)
          .emit('session_ended', { status: 'rejected', id: sessionId });
        this.chatGateway.notifyExpertStatusUpdate(
          session.expert_id,
          'session_ended',
          { status: 'rejected', id: sessionId },
        );
        const res = session;
        if (
          res &&
          typeof res === 'object' &&
          'success' in res &&
          'data' in res
        ) {
          const rest = { ...(res as Record<string, unknown>) };
          delete rest['data'];
          return rest;
        }
      }
      return session;
    }

    return { success: false, message: 'Invalid status update for chat' };
  }

  @Get('session/:sessionId')
  @Header('Cache-Control', 'no-store')
  async getSession(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    const session = await this.chatFacade.getSession(sessionId);
    if (!session) return null;

    return this.enrichSessionTimers(
      session as unknown as Record<string, unknown>,
    );
  }

  @Get('history/:sessionId')
  getHistory(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.chatFacade.getHistory(sessionId);
  }

  /**
   * User-facing endpoint: GET /api/v1/chat/user-session/:expert_id?sessionId=<id>
   * Returns { success, expert, session } shape expected by the client chat room page.
   */
  @Get('user-session/:expert_id')
  @Header('Cache-Control', 'no-store')
  async getUserSession(
    @Param('expert_id', ParseUUIDPipe) expert_id: string,
    @Query('sessionId') sessionIdStr?: string,
  ) {
    let session: Record<string, unknown> | null = null;

    if (sessionIdStr) {
      // sessionId is a UUID string â€” do NOT parseInt it
      session = (await this.chatFacade.getSession(
        sessionIdStr,
      )) as unknown as Record<string, unknown>;
    }

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const enrichedSession = await this.enrichSessionTimers(session);

    // Build the expert object in the shape the frontend Astrologer type expects
    const expertInfo = session.expert as Record<string, unknown> | null;
    const userInfo = expertInfo?.user as Record<string, unknown> | null;
    const expert = expertInfo
      ? {
          id: expertInfo.id,
          name: userInfo?.name || '',
          image: userInfo?.avatar || '/images/dummy-expert.jpg',
          expertise: expertInfo.specialization || '',
          language: expertInfo.languages || '',
          experience: expertInfo.experience || 0,
          ratings: expertInfo.rating || 0,
          price: expertInfo.price_per_minute || 0,
          is_available: expertInfo.is_available || false,
          video: expertInfo.intro_video || null,
          total_likes: expertInfo.total_likes || 0,
        }
      : null;

    // Build session object in the shape the frontend expects
    const sessionData = {
      id: enrichedSession!.id,
      status: enrichedSession!.status,
      isFree: enrichedSession!.is_free ?? false,
      freeMinutes: enrichedSession!.free_minutes ?? 0,
      is_free: enrichedSession!.is_free ?? false,
      free_minutes: enrichedSession!.free_minutes ?? 0,
      messages: [], // Will be populated via socket events
      expiresAt: enrichedSession!.expiresAt,
      startedAt: enrichedSession!.startedAt,
      expires_at: enrichedSession!.expiresAt,
      started_at: enrichedSession!.startedAt,
      remainingSeconds: enrichedSession!.remainingSeconds,
      elapsedSeconds: enrichedSession!.elapsedSeconds,
    };

    return {
      success: true,
      expert,
      session: sessionData,
    };
  }

  @Get('sessions/pending')
  @Header('Cache-Control', 'no-store')
  async getPendingSessions(@CurrentProfile() profileId: string) {
    const { data: sessions, total_count } =
      await this.chatFacade.getExpertSessions(
        profileId,
        ExpertSessionFilter.PENDING,
      );
    const data = await this.processSessions(
      sessions as unknown as Record<string, unknown>[],
    );
    return {
      success: true,
      data,
      meta: { totalCount: total_count, limit: 20, offset: 0 },
    };
  }

  @Get('sessions/completed')
  @Header('Cache-Control', 'no-store')
  async getCompletedSessions(
    @CurrentProfile() profileId: string,
    @Query() dto: GetExpertChatSessionsDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 20;
    const offsetNum = dto.offset ? dto.offset : 0;
    const { data: sessions, total_count } =
      await this.chatFacade.getExpertSessions(
        profileId,
        ExpertSessionFilter.COMPLETED,
        dto,
      );
    const data = await this.processSessions(
      sessions as unknown as Record<string, unknown>[],
    );
    return {
      success: true,
      data,
      meta: {
        totalCount: total_count,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  @Get('sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getRecentPendingSessions(@CurrentProfile() profileId: string) {
    const { data: sessions, total_count } =
      await this.chatFacade.getExpertSessions(
        profileId,
        ExpertSessionFilter.RECENT_PENDING,
      );
    const data = await this.processSessions(
      sessions as unknown as Record<string, unknown>[],
    );
    return {
      success: true,
      data,
      meta: { totalCount: total_count, limit: 20, offset: 0 },
    };
  }

  @Get('sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  async getRecentCompletedSessions(@CurrentProfile() profileId: string) {
    const { data: sessions, total_count } =
      await this.chatFacade.getExpertSessions(
        profileId,
        ExpertSessionFilter.RECENT_COMPLETED,
      );
    const data = await this.processSessions(
      sessions as unknown as Record<string, unknown>[],
    );
    return {
      success: true,
      data,
      meta: { totalCount: total_count, limit: 20, offset: 0 },
    };
  }

  @Get('sessions/all')
  @Header('Cache-Control', 'no-store')
  async getAllSessions(
    @CurrentProfile() profileId: string,
    @Query() dto: GetExpertChatSessionsDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 20;
    const offsetNum = dto.offset ? dto.offset : 0;
    const { data: sessions, total_count } =
      await this.chatFacade.getExpertSessions(
        profileId,
        ExpertSessionFilter.ALL,
        dto,
      );
    const data = await this.processSessions(
      sessions as unknown as Record<string, unknown>[],
    );

    return {
      success: true,
      data,
      meta: {
        totalCount: total_count,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  private async processSessions(sessions: Record<string, unknown>[]) {
    const expiryTime = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );

    return Promise.all(
      sessions.map(async (session) => {
        const userBalance =
          session.status === 'pending'
            ? await this.chatGateway.getWalletBalance(
                session.client_id as string,
              )
            : 0;
        const maxMinutes = session.is_free
          ? session.free_minutes
          : (session.price_per_minute as number) > 0
            ? Math.floor(userBalance / (session.price_per_minute as number))
            : 5;

        return {
          ...session,
          expiresAt:
            session.status === 'pending'
              ? new Date(
                  new Date(session.created_at as string | Date).getTime() +
                    expiryTime,
                )
              : null,
          maxMinutes,
        };
      }),
    );
  }

  @Get('sessions/my-sessions')
  @Header('Cache-Control', 'no-store')
  async getMySessionsAsClient(@CurrentProfile() clientId: string) {
    const sessions = await this.chatFacade.getClientSessions(clientId);
    // expiryTime unused - available for future use

    return Promise.all(
      sessions.map((session) => {
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
  async getActiveClientSession(@CurrentProfile() clientId: string) {
    const session = await this.chatFacade.getActiveClientSession(clientId);
    if (!session) return null;

    return this.enrichSessionTimers(
      session as unknown as Record<string, unknown>,
    );
  }

  private async enrichSessionTimers(
    session: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    if (!session) return session;

    const expiryTimeMs = parseInt(
      process.env.CHAT_REQUEST_EXPIRY_MS || '120000',
      10,
    );
    const serverTime = new Date();
    const createdAt = new Date(session.created_at as string | Date);
    let expiresAt = new Date(createdAt.getTime() + expiryTimeMs);
    let startedAt = session.start_time
      ? new Date(session.start_time as string | Date)
      : null;

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
      const startTime = new Date(session.start_time as string | Date);
      elapsedSeconds = Math.max(
        0,
        Math.floor((serverTime.getTime() - startTime.getTime()) / 1000),
      );

      const wallet = await this.chatGateway.getWallet(
        session.client_id as string,
        'client_id',
      );
      const totalAffordableBalance =
        Number(wallet.balance) + Number(wallet.reserved_balance);
      const price = session.price_per_minute || 0;

      const maxMinutes = session.is_free
        ? session.free_minutes
        : (price as number) > 0
          ? Math.floor(totalAffordableBalance / (price as number))
          : 60; // fallback 60 mins if price is 0 to avoid auto-terminate

      const totalAllowedSeconds = (maxMinutes as number) * 60;
      remainingSeconds = Math.max(0, totalAllowedSeconds - elapsedSeconds);

      expiresAt = new Date(startTime.getTime() + totalAllowedSeconds * 1000);
      startedAt = startTime;
    }

    const sessionObj: Record<string, unknown> =
      typeof (session as { toJSON?: () => unknown }).toJSON === 'function'
        ? (session as { toJSON: () => Record<string, unknown> }).toJSON()
        : (session as unknown as Record<string, unknown>);
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
