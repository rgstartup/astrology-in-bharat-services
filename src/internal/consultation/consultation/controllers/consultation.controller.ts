import {
  Controller,
  Get,
  Query,
  UseGuards,
  Header,
  Post,
  Param,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { consultations } from '@/core/drizzledb/schema';
import { ConsultationStatus } from '@/internal/consultation/enums';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { CurrentProfile } from '@/shared/decorators/current-profile.decorator';
import { type IUser } from '@/shared/types/access-token.payload';
import { RoleEnum } from '@/core/enums';
import { GetUnifiedHistoryUseCase } from '../use-cases/get-unified-history.use-case';
import { GetUnifiedHistoryDto } from '../dto/get-unified-history.dto';

/**
 * Controller handling consultation history and session actions.
 */
@Controller({
  path: 'consultations',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ConsultationController {
  constructor(
    private readonly getUnifiedHistoryUseCase: GetUnifiedHistoryUseCase,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
  ) {}

  /**
   * Retrieves paginated unified consultation history for current client or expert.
   *
   * @param profileId - Profile ID of current user.
   * @param user - Current authenticated user.
   * @param dto - Pagination and search filters.
   * @returns Paginated history list with metadata.
   */
  @Get('history')
  @Header('Cache-Control', 'no-store')
  async getHistory(
    @CurrentProfile() profileId: number,
    @CurrentUser() user: IUser,
    @Query() dto: GetUnifiedHistoryDto,
  ) {
    const limitNum = dto.limit ? dto.limit : 20;
    const offsetNum = dto.offset ? dto.offset : 0;

    const isExpert = user.role === RoleEnum.EXPERT;

    const { data, totalCount } = await this.getUnifiedHistoryUseCase.execute(
      profileId,
      isExpert,
      dto,
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

  /**
   * Rejects an active or pending consultation booking request.
   *
   * @param sessionId - Consultation ID.
   * @returns Success response indicating outcome.
   */
  @Post('reject/:sessionId')
  async reject(@Param('sessionId', ParseIntPipe) sessionId: number) {
    const now = new Date();
    const [row] = await this.db
      .update(consultations)
      .set({
        status: ConsultationStatus.REJECTED,
        cancelled_at: now,
        updated_at: now,
      })
      .where(
        and(
          eq(consultations.id, sessionId),
          eq(consultations.status, ConsultationStatus.REQUESTED),
        ),
      )
      .returning();

    if (!row) {
      return {
        success: false,
        message: 'Session not found or cannot be rejected',
      };
    }

    return { success: true, message: 'Consultation rejected' };
  }
}
