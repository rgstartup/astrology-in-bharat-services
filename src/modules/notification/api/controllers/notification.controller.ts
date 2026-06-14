import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { NotificationFacade } from '../../application/notification.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';

@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationFacade: NotificationFacade) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: IUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const { data, totalCount } =
      await this.notificationFacade.getUserNotifications(
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

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: IUser) {
    const count = await this.notificationFacade.getUnreadCount(user.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: IUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const _result = await this.notificationFacade.markAsRead(id, user.id);
    return { success: true };
  }

  @Delete('all')
  async clearAll(@CurrentUser() user: IUser) {
    const _result = await this.notificationFacade.clearAll(user.id);
    return { success: true };
  }
}
