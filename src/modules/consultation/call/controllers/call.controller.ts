import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Header,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { CallType } from '../entities/call-session.entity';
import { CallFacade } from '../call.facade';
import { CallSessionFilter } from '../use-cases/get-expert-sessions.use-case';
import { CallGateway } from '../call.gateway';
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
    @CurrentProfile() clientId: number,
    @Body() dto: InitiateCallDto,
  ) {
    console.log(
      `[CallController] Initiate call: clientId=${clientId}, expert_id=${dto.expert_id}, type=${dto.type || CallType.AUDIO}`,
    );
    return this.callFacade.initiate(clientId, dto);
  }

  @Post('accept')
  async accept(
    @CurrentProfile() profileId: number,
    @Body() body: { sessionId: number },
  ) {
    console.log(
      `[CallController] Accept call: profileId=${profileId}, sessionId=${body.sessionId}`,
    );
    return this.callFacade.accept(profileId, body.sessionId);
  }

  @Post('end')
  async end(@Body() dto: EndCallDto) {
    console.log(
      `[CallController] End call: sessionId=${dto.sessionId}, endedBy=${dto.endedBy}`,
    );
    return this.callFacade.end(dto);
  }

  @Patch('session/:sessionId/status')
  async updateStatus(
    @CurrentProfile() profileId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
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
  async getSession(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.callFacade.getSession(sessionId);
  }

  @Get('token/:sessionId')
  @Header('Cache-Control', 'no-store')
  async getToken(
    @CurrentProfile() profileId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.callFacade.getCallToken(profileId, sessionId);
  }

  @Get('sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getPendingAppointments(@CurrentProfile() profileId: number) {
    return this.callFacade.getExpertSessions(
      profileId,
      CallSessionFilter.RECENT_PENDING,
    );
  }

  @Get('sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  async getCompletedAppointments(@CurrentProfile() profileId: number) {
    return this.callFacade.getExpertSessions(
      profileId,
      CallSessionFilter.RECENT_COMPLETED,
    );
  }

  @Get('sessions/all')
  @Header('Cache-Control', 'no-store')
  async getAllSessions(
    @CurrentProfile() profileId: number,
    @Query() dto: GetCallSessionsDto,
  ) {
    return this.callFacade.getExpertSessions(
      profileId,
      CallSessionFilter.ALL,
      dto,
    );
  }
}
