import { Controller, Get, Param, Patch, Delete, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { NotificationFacade } from '../../application/notification.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';

@Controller({
    path: 'notifications',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationFacade: NotificationFacade) { }

    @Get()
    async getNotifications(
        @CurrentUser() user: User,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        const { data, totalCount } = await this.notificationFacade.getUserNotifications(user.id, limitNum, offsetNum);
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
    async getUnreadCount(@CurrentUser() user: User) {
        const count = await this.notificationFacade.getUnreadCount(user.id);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.notificationFacade.markAsRead(id, user.id);
    }

    @Delete('all')
    async clearAll(@CurrentUser() user: User) {
        return this.notificationFacade.clearAll(user.id);
    }
}
