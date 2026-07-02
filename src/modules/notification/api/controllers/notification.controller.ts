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
import { NotificationFacade, ProfileType } from '../../application/notification.facade';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

function deriveProfileType(roles: RoleEnum[]): ProfileType {
  if (roles.includes(RoleEnum.EXPERT)) return RoleEnum.EXPERT;
  if (roles.includes(RoleEnum.MERCHANT)) return RoleEnum.MERCHANT;
  if (roles.includes(RoleEnum.AGENT)) return RoleEnum.AGENT;
  return RoleEnum.CLIENT;
}

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
    @CurrentProfile() profileId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const profileType = deriveProfileType(user.roles);
    const { data, totalCount } =
      await this.notificationFacade.getUserNotifications(
        profileId,
        profileType,
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
  async getUnreadCount(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: string,
  ) {
    const profileType = deriveProfileType(user.roles);
    const count = await this.notificationFacade.getUnreadCount(profileId, profileType);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentProfile() profileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const _result = await this.notificationFacade.markAsRead(id, profileId);
    return { success: true };
  }

  @Delete('all')
  async clearAll(
    @CurrentUser() user: IUser,
    @CurrentProfile() profileId: string,
  ) {
    const profileType = deriveProfileType(user.roles);
    const _result = await this.notificationFacade.clearAll(profileId, profileType);
    return { success: true };
  }
}
