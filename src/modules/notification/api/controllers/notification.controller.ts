import { Controller, Get, Param, Patch, Delete, UseGuards, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { NotificationFacade } from '../../application/notification.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { UserRepository } from '@/modules/users/infrastructure/persistence/repositories/user.repository';

@Controller({
    path: 'notifications',
    version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(
        private readonly notificationFacade: NotificationFacade,
        private readonly userRepository: UserRepository,
    ) {}

    private async resolveUserId(betterAuthId: string): Promise<number> {
        const localUser = await this.userRepository.findByBetterAuthId(betterAuthId);
        if (!localUser) throw new NotFoundException('User not found');
        return localUser.id;
    }

    @Get()
    async getNotifications(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.notificationFacade.getUserNotifications(userId);
    }

    @Get('unread-count')
    async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        const count = await this.notificationFacade.getUnreadCount(userId);
        return { count };
    }

    @Patch(':id/read')
    async markAsRead(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseIntPipe) id: number,
    ) {
        const userId = await this.resolveUserId(user.id);
        return this.notificationFacade.markAsRead(id, userId);
    }

    @Delete('all')
    async clearAll(@CurrentUser() user: AuthenticatedUser) {
        const userId = await this.resolveUserId(user.id);
        return this.notificationFacade.clearAll(userId);
    }
}
