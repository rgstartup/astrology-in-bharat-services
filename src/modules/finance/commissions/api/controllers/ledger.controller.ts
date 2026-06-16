import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CommissionsFacade } from '../../application/commissions.facade';
import { QueryLedgerDto, QueryLedgerSummaryDto } from '../dto/query-ledger.dto';

@Controller({ path: 'admin/finance/ledger', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LedgerController {
  constructor(private readonly commissionsFacade: CommissionsFacade) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query() query: QueryLedgerDto) {
    return this.commissionsFacade.getLedger(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  summary(@Query() query: QueryLedgerSummaryDto) {
    return this.commissionsFacade.getLedgerSummary(query);
  }
}
