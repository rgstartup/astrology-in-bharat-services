import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { GetUnifiedHistoryUseCase } from '../../application/use-cases/get-unified-history.use-case';
import { CallFacade } from '@/modules/consultation/call/application/call.facade';
import { ChatFacade } from '@/modules/consultation/chat/application/chat.facade';
import { GetUnifiedHistoryDto } from '../dto/get-unified-history.dto';
import { Post, Param, ParseUUIDPipe } from '@nestjs/common';

@Controller({
  path: 'consultations',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  constructor(
    private readonly getUnifiedHistoryUseCase: GetUnifiedHistoryUseCase,
    private readonly callFacade: CallFacade,
    private readonly chatFacade: ChatFacade,
  ) {}

  @Get('history')
  @Header('Cache-Control', 'no-store')
  async getHistory(
    @CurrentProfile() profileId: string,
    @CurrentUser() user: IUser,
    @Query() dto: GetUnifiedHistoryDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 20;
    const offsetNum = dto.offset ? dto.offset : 0;

    const isExpert = user.roles.includes(RoleEnum.EXPERT);

    const { data, totalCount } = await this.getUnifiedHistoryUseCase.execute(
      profileId,
      isExpert,
      dto,
    );

    return {
      success: true,
      data,
      meta: {
        totalCount,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  @Post('reject/:sessionId')
  async reject(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('type') type?: string,
  ) {
    if (type === 'call') {
      await this.callFacade.reject(sessionId);
      return { success: true, message: 'Call rejected' };
    } else if (type === 'chat') {
      await this.chatFacade.rejectSession(sessionId);
      return { success: true, message: 'Chat rejected' };
    }

    // Auto-detect if type not provided
    try {
      const callSession = await this.callFacade.getSession(sessionId);
      if (callSession) {
        await this.callFacade.reject(sessionId);
        return { success: true, message: 'Call rejected' };
      }
    } catch (_e) {
      console.debug('Not a call session');
    }

    try {
      const chatSession = await this.chatFacade.getSession(sessionId);
      if (chatSession) {
        await this.chatFacade.rejectSession(sessionId);
        return { success: true, message: 'Chat rejected' };
      }
    } catch (_e) {
      console.debug('Not a chat session');
    }

    return { success: false, message: 'Session not found' };
  }
}
