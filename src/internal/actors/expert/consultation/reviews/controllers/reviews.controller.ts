import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PaginatedResponseDto } from "@/shared/dto/paginated-response.dto";
import { ExpertJwtAuthGuard } from "@/internal/actors/expert/auth/guards/auth.guard";
import { CurrentExpert } from "@/internal/actors/expert/auth/decorators/current-expert.decorator";
import type { IExpert } from "@/shared/types/access-token.payload";
import { ExpertReviewsService } from "../expert-reviews.service";
import { GetExpertReviewsDto } from "../dto/get-expert-reviews.dto";
import { ReviewDomain } from "../reviews.mapper";

@Controller({
  path: "expert/me/reviews",
  version: "1",
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertReviewsController {
  constructor(private readonly expertReviewsService: ExpertReviewsService) {}

  @Get()
  async getMyReviews(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertReviewsDto,
  ): Promise<PaginatedResponseDto<ReviewDomain>> {
    const result = await this.expertReviewsService.getExpertReviews(
      Number(expert.sub),
      dto,
    );
    return PaginatedResponseDto.from(result.data, result.total, {
      page: dto.page,
      limit: dto.limit,
    });
  }

  @Get("stats")
  async getMyReviewsStats(@CurrentExpert() expert: IExpert) {
    return this.expertReviewsService.getExpertReviewsStats(Number(expert.sub));
  }
}
