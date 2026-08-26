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
import { ClientNotificationFacade } from '../notification.facade';
import { ClientJwtAuthGuard } from '@/modules/client/auth/guards/auth.guard';
import { CurrentClient } from '@/common/decorators/current-client.decorator';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { GetNotificationsDto } from '@/modules/notification/api/dto/get-notifications.dto';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';

@Controller({
  path: 'client/notifications',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientNotificationController {
  constructor(
    private readonly clientNotificationFacade: ClientNotificationFacade,
  ) { }

  @Get()
  async getNotifications(
    @CurrentClient() client: ClientAccount,
    @Query() dto: GetNotificationsDto,
  ) {
    const { data, totalCount } =
      await this.clientNotificationFacade.getNotifications(client.id, dto);
    return {
      success: true,
      data,
      meta: {
        totalCount,
        limit: dto.limit,
        offset: dto.offset,
      },
    };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentClient() client: ClientAccount) {
    const count = await this.clientNotificationFacade.getUnreadCount(client.id);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentClient() client: ClientAccount,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.clientNotificationFacade.markAsRead(id, client.id);
    return new BooleanMessage(true, "Notification marked as read");
  }

  @Delete()
  async clear(@CurrentClient() client: ClientAccount) {
    await this.clientNotificationFacade.clear(client.id);
    return new BooleanMessage(true, "All notifications cleared");
  }
}
