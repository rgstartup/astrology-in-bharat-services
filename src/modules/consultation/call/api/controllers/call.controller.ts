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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';
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
  // ... (lines 14-24 remains same)
  async initiate(
    @CurrentUser() user: IUser,
    @Body() body: { expert_id: string; type?: CallType },
  ) {
    console.log(
      `[CallController] Initiate call: userId=${user.id}, expert_id=${body.expert_id}, type=${body.type || CallType.AUDIO}`,
    );
    return this.callFacade.initiate(
      user.id,
      body.expert_id,
      body.type || CallType.AUDIO,
    );
  }

  @Post('accept')
  async accept(@CurrentUser() user: IUser, @Body() body: { sessionId: string }) {
    console.log(
      `[CallController] Accept call: userId=${user.id}, sessionId=${body.sessionId}`,
    );
    return this.callFacade.accept(user.id, body.sessionId);
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
    @CurrentUser() user: IUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body('status') status: string,
  ) {
    console.log(
      `[CallController] Expert Updating status of call session ${sessionId} to ${status}`,
    );

    if (status === 'accepted') {
      await this.callFacade.accept(user.id, sessionId);
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
    @CurrentUser() user: IUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.callFacade.getCallToken(user.id, sessionId);
  }

  @Get('sessions/appointments/pending')
  @Header('Cache-Control', 'no-store')
  async getPendingAppointments(@CurrentUser() user: IUser) {
    return this.callFacade.getExpertSessions(
      user.id,
      CallSessionFilter.RECENT_PENDING,
    );
  }

  @Get('sessions/appointments/completed')
  @Header('Cache-Control', 'no-store')
  async getCompletedAppointments(@CurrentUser() user: IUser) {
    return this.callFacade.getExpertSessions(
      user.id,
      CallSessionFilter.RECENT_COMPLETED,
    );
  }

  @Get('sessions/all')
  @Header('Cache-Control', 'no-store')
  async getAllSessions(
    @CurrentUser() user: IUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    return this.callFacade.getExpertSessions(user.id, CallSessionFilter.ALL, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      search,
    });
  }
}
