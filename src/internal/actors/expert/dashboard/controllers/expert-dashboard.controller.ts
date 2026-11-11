import { Controller, Get, UseGuards, Query } from "@nestjs/common";
import { ExpertDashboardService } from "../expert-dashboard.service";
import { ExpertJwtAuthGuard } from "../../auth/guards/auth.guard";
import { CurrentExpert } from "../../auth/decorators/current-expert.decorator";
import { type IExpert } from "@/shared/types/access-token.payload";
import { GetDashboardStatsDto } from "../dto/get-dashboard-stats.dto";

@Controller({
  path: "expert-dashboard",
  version: "1",
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertDashboardController {
  constructor(private readonly dashboardService: ExpertDashboardService) {}

  @Get("stats")
  async getStats(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetDashboardStatsDto,
  ) {
    const stats = await this.dashboardService.getDashboardStats(
      expert.sub,
      dto.period,
      dto.startDate,
      dto.endDate,
    );
    return {
      success: true,
      data: stats,
    };
  }
}
