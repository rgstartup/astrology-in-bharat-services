import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CommissionsFacade } from '../commissions.facade';
import {
  QueryCommissionSplitsDto,
  QueryCommissionSplitsSummaryDto,
} from '../dto/query-commission-splits.dto';

@Controller({ path: 'admin/finance/commission-splits', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CommissionSplitsController {
  constructor(private readonly commissionsFacade: CommissionsFacade) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query() query: QueryCommissionSplitsDto) {
    return this.commissionsFacade.getCommissionSplits(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  summary(@Query() query: QueryCommissionSplitsSummaryDto) {
    return this.commissionsFacade.getCommissionSplitsSummary(query);
  }
}
