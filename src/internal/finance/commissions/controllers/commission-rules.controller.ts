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
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { RolesGuard } from '@/internal/auth/guards/role.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CommissionsService } from '../commissions.service';
import { CreateCommissionRuleDto } from '../dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from '../dto/update-commission-rule.dto';
import { QueryCommissionRulesDto } from '../dto/query-commission-rules.dto';

@Controller({ path: 'admin/commissions/rules', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CommissionRulesController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query() query: QueryCommissionRulesDto) {
    return this.commissionsService.listRules(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCommissionRuleDto) {
    return this.commissionsService.createRule(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    return this.commissionsService.updateRule(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.commissionsService.deactivateRule(id);
  }
}
