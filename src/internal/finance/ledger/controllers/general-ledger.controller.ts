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
import { GeneralLedgerService } from '../ledger.service';
import { QueryGeneralLedgerDto } from '../dto/query-general-ledger.dto';

@Controller({ path: 'admin/finance/general-ledger', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class GeneralLedgerController {
  constructor(private readonly generalLedgerService: GeneralLedgerService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  query(@Query() dto: QueryGeneralLedgerDto) {
    return this.generalLedgerService.query(dto);
  }
}
