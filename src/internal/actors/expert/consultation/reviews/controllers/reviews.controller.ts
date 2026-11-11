import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { PaginatedResponseDto } from "@/shared/dto/paginated-response.dto";
import { ExpertJwtAuthGuard } from "@/internal/actors/expert/auth/guards/auth.guard";
import { CurrentExpert } from "@/internal/actors/expert/auth/decorators/current-expert.decorator";
import type { IExpert } from "@/shared/types/access-token.payload";
import { ExpertReviewsService } from "../expert-reviews.service";
import { GetExpertReviewsDto } from "../dto/get-expert-reviews.dto";
import { GetExpertReviewsByDateDto } from "../dto/get-expert-reviews-by-date.dto";
import { ReviewDomain } from "../reviews.mapper";

@Controller({
  path: "expert/reviews",
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

  @Get("by-date")
  async getMyReviewsByDate(
    @CurrentExpert() expert: IExpert,
    @Query() dto: GetExpertReviewsByDateDto,
  ): Promise<PaginatedResponseDto<ReviewDomain>> {
    const result = await this.expertReviewsService.getExpertReviewsByDate(
      Number(expert.sub),
      dto,
    );
    return PaginatedResponseDto.from(result.data, result.total, {
      page: dto.page,
      limit: dto.limit,
    });
  }

  @Get(":expert_id")
  async getExpertReviews(
    @Param("expert_id", ParseIntPipe) expert_id: number,
    @Query() dto: GetExpertReviewsDto,
  ): Promise<PaginatedResponseDto<ReviewDomain>> {
    const result = await this.expertReviewsService.getExpertReviews(
      expert_id,
      dto,
    );
    return PaginatedResponseDto.from(result.data, result.total, {
      page: dto.page,
      limit: dto.limit,
    });
  }

  @Get(":expert_id/stats")
  async getExpertReviewsStats(
    @Param("expert_id", ParseIntPipe) expert_id: number,
  ) {
    return this.expertReviewsService.getExpertReviewsStats(expert_id);
  }

  @Get(":expert_id/by-date")
  async getExpertReviewsByDate(
    @Param("expert_id", ParseIntPipe) expert_id: number,
    @Query() dto: GetExpertReviewsByDateDto,
  ): Promise<PaginatedResponseDto<ReviewDomain>> {
    const result = await this.expertReviewsService.getExpertReviewsByDate(
      expert_id,
      dto,
    );
    return PaginatedResponseDto.from(result.data, result.total, {
      page: dto.page,
      limit: dto.limit,
    });
  }
}
