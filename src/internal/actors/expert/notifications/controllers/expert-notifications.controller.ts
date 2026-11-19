import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  Param,
} from "@nestjs/common";
import { ExpertNotificationsService } from "../notifications.service";
import { ExpertJwtAuthGuard } from "../../auth/guards/auth.guard";
import { CurrentExpert } from "../../auth/decorators/current-expert.decorator";
import { type IExpert } from "@/shared/types/access-token.payload";
import { GetExpertNotificationsDto } from "../dto/get-expert-notifications.dto";
import { ApiResponse } from "@/shared/http/responses";

@Controller({
  path: "expert/me/notifications",
  version: "1",
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertNotificationsController {
  constructor(
    private readonly notificationsService: ExpertNotificationsService,
  ) {}

  @Get()
  async getNotifications(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertNotificationsDto,
  ) {
    const { data, totalCount } =
      await this.notificationsService.getNotifications(expert.sub, dto);
    return ApiResponse.paginated(data, dto.page, dto.limit, totalCount);
  }

  @Get("count")
  async getUnreadCount(@CurrentExpert() expert: IExpert) {
    const count = await this.notificationsService.getUnreadCount(expert.sub);
    return { count };
  }

  @Patch(":id/read")
  async markAsRead(
    @CurrentExpert() expert: IExpert,
    @Param("id", ParseIntPipe) id: number,
  ) {
    await this.notificationsService.markAsRead(expert.sub, id);
    return { success: true };
  }

  @Delete()
  async deleteAll(@CurrentExpert() expert: IExpert) {
    await this.notificationsService.clearAll(expert.sub);
    return { success: true };
  }
}
