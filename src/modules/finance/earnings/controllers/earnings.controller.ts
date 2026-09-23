import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { EarningsFacade } from '../earnings.facade';
import {
  CalculateEarningsInput,
  CreateEarningPolicyDto,
  QueryEarningSplitsDto,
} from '../dto';

@Controller({ path: 'admin/finance/earnings', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EarningsController {
  constructor(private readonly earningsFacade: EarningsFacade) {}

  @Get('policies')
  @HttpCode(HttpStatus.OK)
  listPolicies() {
    return this.earningsFacade.listPolicies();
  }

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  createPolicy(@Body() dto: CreateEarningPolicyDto) {
    return this.earningsFacade.createPolicy(dto);
  }

  @Post('calculate-preview')
  @HttpCode(HttpStatus.OK)
  calculatePreview(@Body() input: CalculateEarningsInput) {
    return this.earningsFacade.calculateEarnings(input);
  }

  @Get('splits')
  @HttpCode(HttpStatus.OK)
  getSplits(@Query() query: QueryEarningSplitsDto) {
    return this.earningsFacade.getEarningSplits(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  getSummary(@Query() query: QueryEarningSplitsDto) {
    return this.earningsFacade.getEarningsSummary(query);
  }
}
