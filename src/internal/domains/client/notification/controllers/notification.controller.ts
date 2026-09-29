import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ClientNotificationService } from '../notification.service';
import { ClientJwtAuthGuard } from '@/internal/domains/client/auth/guards/auth.guard';
import { CurrentClient } from '@/internal/domains/client/auth/decorators/current-client.decorator';
import { ClientAccount } from '@/internal/domains/client/account/entities/account.entity';
import { GetNotificationsDto } from '@/internal/notification/dto/get-notifications.dto';
import { BooleanMessage } from '@/shared/dto/boolean-message.dto';

@Controller({
  path: 'client/notifications',
  version: '1',
})
@UseGuards(ClientJwtAuthGuard)
export class ClientNotificationController {
  constructor(
    private readonly clientNotificationService: ClientNotificationService,
  ) {}

  @Get()
  async getNotifications(
    @CurrentClient() client: ClientAccount,
    @Query() dto: GetNotificationsDto,
  ) {
    const { data, totalCount } =
      await this.clientNotificationService.getNotifications(client.id, dto);
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
    const count = await this.clientNotificationService.getUnreadCount(
      client.id,
    );
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentClient() client: ClientAccount,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.clientNotificationService.markAsRead(id, client.id);
    return new BooleanMessage(true, 'Notification marked as read');
  }

  @Delete()
  async clear(@CurrentClient() client: ClientAccount) {
    await this.clientNotificationService.clear(client.id);
    return new BooleanMessage(true, 'All notifications cleared');
  }
}
