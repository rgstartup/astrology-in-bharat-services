import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { GetUnifiedHistoryUseCase } from '../../application/use-cases/get-unified-history.use-case';
import { CallFacade } from '@/modules/call/application/call.facade';
import { ChatFacade } from '@/modules/chat/application/chat.facade';
import { Post, Param, ParseIntPipe } from '@nestjs/common';

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
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const { data, totalCount } = await this.getUnifiedHistoryUseCase.execute(
      user.id,
      limitNum,
      offsetNum,
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
    @Param('sessionId', ParseIntPipe) sessionId: number,
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
    } catch {}

    try {
      const chatSession = await this.chatFacade.getSession(sessionId);
      if (chatSession) {
        await this.chatFacade.rejectSession(sessionId);
        return { success: true, message: 'Chat rejected' };
      }
    } catch {}

    return { success: false, message: 'Session not found' };
  }
}
