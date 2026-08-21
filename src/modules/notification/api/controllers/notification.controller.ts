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
import {
  NotificationFacade,
  ProfileType,
} from '../../application/notification.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
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
  constructor(private readonly notificationFacade: NotificationFacade) { }

  @Get()
  async getNotifications(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: string,
    @Query() dto: GetNotificationsDto,
  ) {
    const profileType = deriveProfileType(user.role);
    const { data, totalCount } =
      await this.notificationFacade.getUserNotifications(
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
  async getUnreadCount(
    @CurrentUser() user: IUser,
  ) {
    if (!user.profile) {
      return { count: 0 };
    }
    const profileType = deriveProfileType(user.role);
    const count = await this.notificationFacade.getUnreadCount(
      user.profile,
      profileType,
    );
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const profileType = deriveProfileType(user.role);
    const _result = await this.notificationFacade.markAsRead(id, profileId, profileType);
    return { success: true };
  }

  @Delete('all')
  async clearAll(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: string,
  ) {
    const profileType = deriveProfileType(user.role);
    const _result = await this.notificationFacade.clearAll(
      profileId,
      profileType,
    );
    return { success: true };
  }
}
