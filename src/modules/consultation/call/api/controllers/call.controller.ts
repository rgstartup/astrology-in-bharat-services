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
import { InitiateCallDto } from '../dto/initiate-call.dto';
import { EndCallDto } from '../dto/end-call.dto';
import { GetCallSessionsDto } from '../dto/get-call-sessions.dto';

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
    @Body() dto: InitiateCallDto,
  ) {
    console.log(
      `[CallController] Initiate call: clientId=${clientId}, expert_id=${dto.expert_id}, type=${dto.type || CallType.AUDIO}`,
    );
    return this.callFacade.initiate(
      clientId,
      dto,
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
    @Body() dto: EndCallDto,
  ) {
    console.log(
      `[CallController] End call: sessionId=${dto.sessionId}, endedBy=${dto.endedBy}`,
    );
    return this.callFacade.end(dto);
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
    @Query() dto: GetCallSessionsDto,
  ) {
    return this.callFacade.getExpertSessions(profileId, CallSessionFilter.ALL, dto);
  }
}
