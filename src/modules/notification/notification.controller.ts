import { Controller, Get, Param, Patch, UseGuards, ParseIntPipe } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';

@Controller({
    path: 'notifications',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async getNotifications(@CurrentUser() user: User) {
        return this.notificationService.getUserNotifications(user.id);
    }

    @Get('unread-count')
    async getUnreadCount(@CurrentUser() user: User) {
        const count = await this.notificationService.getUnreadCount(user.id);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this.notificationService.markAsRead(id, user.id);
    }
}
