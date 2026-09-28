import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CurrentProfile } from '@/shared/decorators/current-profile.decorator';
import { IUser } from '@/shared/types/access-token.payload';
import { RoleEnum } from '@/internal/users/enums/Role.enum';
import { GetUnifiedHistoryUseCase } from '../use-cases/get-unified-history.use-case';
import { CallService } from '@/internal/consultation/call/call.service';
import { ChatService } from '@/internal/consultation/chat/chat.service';
import { GetUnifiedHistoryDto } from '../dto/get-unified-history.dto';
import { Post, Param, ParseIntPipe } from '@nestjs/common';

@Controller({
  path: 'consultations',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  constructor(
    private readonly getUnifiedHistoryUseCase: GetUnifiedHistoryUseCase,
    private readonly callService: CallService,
    private readonly chatService: ChatService,
  ) {}

  @Get('history')
  @Header('Cache-Control', 'no-store')
  async getHistory(
    @CurrentProfile() profileId: number,
    @CurrentUser() user: IUser,
    @Query() dto: GetUnifiedHistoryDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 20;
    const offsetNum = dto.offset ? dto.offset : 0;

    const isExpert = user.role === RoleEnum.EXPERT;

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
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query('type') type?: string,
  ) {
    if (type === 'call') {
      await this.callService.reject(sessionId);
      return { success: true, message: 'Call rejected' };
    } else if (type === 'chat') {
      await this.chatService.rejectSession(sessionId);
      return { success: true, message: 'Chat rejected' };
    }

    // Auto-detect if type not provided
    try {
      const callSession = await this.callService.getSession(sessionId);
      if (callSession) {
        await this.callService.reject(sessionId);
        return { success: true, message: 'Call rejected' };
      }
    } catch (_e) {
      console.debug('Not a call session');
    }

    try {
      const chatSession = await this.chatService.getSession(sessionId);
      if (chatSession) {
        await this.chatService.rejectSession(sessionId);
        return { success: true, message: 'Chat rejected' };
      }
    } catch (_e) {
      console.debug('Not a chat session');
    }

    return { success: false, message: 'Session not found' };
  }
}
