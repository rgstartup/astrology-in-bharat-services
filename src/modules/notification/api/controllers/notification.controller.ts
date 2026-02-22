import { Controller, Get, Param, Patch, UseGuards, ParseIntPipe } from '@nestjs/common';
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
    async getNotifications(@CurrentUser() user: User) {
        return this.notificationFacade.getUserNotifications(user.id);
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
}
