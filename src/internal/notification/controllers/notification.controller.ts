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
import { NotificationService, ProfileType } from '../notification.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { CurrentProfile } from '../../../shared/decorators/current-profile.decorator';
import { type IUser } from '../../../shared/types/access-token.payload';
import { RoleEnum } from '../../users/enums/Role.enum';
import { GetNotificationsDto } from '../dto/get-notifications.dto';

function deriveProfileType(role: RoleEnum): ProfileType {
  if (role === RoleEnum.EXPERT) return RoleEnum.EXPERT;
  if (role === RoleEnum.MERCHANT) return RoleEnum.MERCHANT;
  if (role === RoleEnum.AGENT) return RoleEnum.AGENT;
  return RoleEnum.CLIENT;
}

@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: number,
    @Query() dto: GetNotificationsDto,
  ) {
    const profileType = deriveProfileType(user.role);
    const { data, totalCount } =
      await this.notificationService.getUserNotifications(
        profileId,
        profileType,
        dto,
      );
    return {
      success: true,
      data,
      meta: {
        totalCount,
        limit: dto.limit ?? 20,
        offset: dto.offset ?? 0,
      },
    };
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: IUser) {
    if (!user.profile) {
      return { count: 0 };
    }
    const profileType = deriveProfileType(user.role);
    const count = await this.notificationService.getUnreadCount(
      user.profile,
      profileType,
    );
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const profileType = deriveProfileType(user.role);
    const _result = await this.notificationService.markAsRead(
      id,
      profileId,
      profileType,
    );
    return { success: true };
  }

  @Delete('all')
  async clearAll(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: number,
  ) {
    const profileType = deriveProfileType(user.role);
    const _result = await this.notificationService.clearAll(
      profileId,
      profileType,
    );
    return { success: true };
  }
}
