import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { CallType } from '../../infrastructure/entities/call-session.entity';
import { CallFacade } from '../../application/call.facade';
import { CallSessionFilter } from '../../application/use-cases/get-expert-sessions.use-case';
import { CallGateway } from '../../call.gateway';

@Controller({
  path: 'call',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(
    private readonly callFacade: CallFacade,
    private readonly callGateway: CallGateway,
  ) {}

  @Post('initiate')
  async initiate(
    @CurrentProfile() clientId: string,
    @Body() body: { expert_id: string; type?: CallType },
  ) {
    console.log(
      `[CallController] Initiate call: clientId=${clientId}, expert_id=${body.expert_id}, type=${body.type || CallType.AUDIO}`,
    );
    return this.callFacade.initiate(
      clientId,
      body.expert_id,
      body.type || CallType.AUDIO,
    );
  }

  @Post('accept')
  async accept(
    @CurrentProfile() profileId: string,
    @Body() body: { sessionId: string },
  ) {
    console.log(
      `[CallController] Accept call: profileId=${profileId}, sessionId=${body.sessionId}`,
    );
    return this.callFacade.accept(profileId, body.sessionId);
  }

  @Post('end')
  async end(
    @Body() body: { sessionId: string; endedBy?: string; reason?: string },
  ) {
    console.log(
      `[CallController] End call: sessionId=${body.sessionId}, endedBy=${body.endedBy}`,
    );
    return this.callFacade.end(body.sessionId, body.endedBy, body.reason);
  }

  @Patch('session/:sessionId/status')
  async updateStatus(
    @CurrentProfile() profileId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('status') status: string,
  ) {
    console.log(
      `[CallController] Expert Updating status of call session ${sessionId} to ${status}`,
    );

    if (status === 'accepted') {
      await this.callFacade.accept(profileId, sessionId);
      return { success: true };
    }

    if (status === 'rejected' || status === 'cancelled') {
      const terminator = status === 'rejected' ? 'EXPERT' : 'USER';
      await this.callFacade.end(
        sessionId,
        terminator,
        'Rejection/Cancellation',
      );
      return { success: true };
    }

    return { success: false, message: 'Invalid status update for call' };
  }

  @Get('session/:sessionId')
  @Header('Cache-Control', 'no-store')
  async getSession(@Param('sessionId', ParseUUIDPipe) sessionId: string) {
    return this.callFacade.getSession(sessionId);
  }

  @Get('token/:sessionId')
  @Header('Cache-Control', 'no-store')
  async getToken(
    @CurrentProfile() profileId: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.callFacade.getCallToken(profileId, sessionId);
  }

  @Get('sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getPendingAppointments(@CurrentProfile() profileId: string) {
    return this.callFacade.getExpertSessions(
      profileId,
      CallSessionFilter.RECENT_PENDING,
    );
  }

  @Get('sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  async getCompletedAppointments(@CurrentProfile() profileId: string) {
    return this.callFacade.getExpertSessions(
      profileId,
      CallSessionFilter.RECENT_COMPLETED,
    );
  }

  @Get('sessions/all')
  @Header('Cache-Control', 'no-store')
  async getAllSessions(
    @CurrentProfile() profileId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    return this.callFacade.getExpertSessions(profileId, CallSessionFilter.ALL, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search,
    });
  }
}
