import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RolesGuard } from '../../../auth/guards/role.guard';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { CommissionsService } from '../commissions.service';
import {
  QueryCommissionSplitsDto,
  QueryCommissionSplitsSummaryDto,
} from '../dto/query-commission-splits.dto';

@Controller({ path: 'admin/finance/commission-splits', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CommissionSplitsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query() query: QueryCommissionSplitsDto) {
    return this.commissionsService.getCommissionSplits(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  summary(@Query() query: QueryCommissionSplitsSummaryDto) {
    return this.commissionsService.getCommissionSplitsSummary(query);
  }
}
