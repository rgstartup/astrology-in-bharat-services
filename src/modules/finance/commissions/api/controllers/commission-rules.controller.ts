import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CommissionsFacade } from '../../application/commissions.facade';
import { CreateCommissionRuleDto } from '../dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from '../dto/update-commission-rule.dto';
import { QueryCommissionRulesDto } from '../dto/query-commission-rules.dto';

@Controller({ path: 'admin/commissions/rules', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CommissionRulesController {
  constructor(private readonly commissionsFacade: CommissionsFacade) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query() query: QueryCommissionRulesDto) {
    return this.commissionsFacade.listRules(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionsFacade.createRule(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    return this.commissionsFacade.updateRule(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissionsFacade.deactivateRule(id);
  }
}
