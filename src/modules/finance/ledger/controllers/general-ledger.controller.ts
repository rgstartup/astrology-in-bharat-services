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
import { GeneralLedgerFacade } from '../general-ledger.facade';
import { QueryGeneralLedgerDto } from '../dto/query-general-ledger.dto';

@Controller({ path: 'admin/finance/general-ledger', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class GeneralLedgerController {
  constructor(private readonly generalLedgerFacade: GeneralLedgerFacade) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  query(@Query() dto: QueryGeneralLedgerDto) {
    return this.generalLedgerFacade.query(dto);
  }
}
