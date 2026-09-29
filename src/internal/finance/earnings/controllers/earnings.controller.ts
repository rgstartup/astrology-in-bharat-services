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
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RolesGuard } from '../../../auth/guards/role.guard';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { EarningsService } from '../earnings.service';
import {
  type CalculateEarningsInput,
  CreateEarningPolicyDto,
  QueryEarningSplitsDto,
} from '../dto';

@Controller({ path: 'admin/finance/earnings', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EarningsController {
  constructor(private readonly earningsService: EarningsService) {}

  @Get('policies')
  @HttpCode(HttpStatus.OK)
  listPolicies() {
    return this.earningsService.listPolicies();
  }

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  createPolicy(@Body() dto: CreateEarningPolicyDto) {
    return this.earningsService.createPolicy(dto);
  }

  @Post('calculate-preview')
  @HttpCode(HttpStatus.OK)
  calculatePreview(@Body() input: CalculateEarningsInput) {
    return this.earningsService.calculateEarnings(input);
  }

  @Get('splits')
  @HttpCode(HttpStatus.OK)
  getSplits(@Query() query: QueryEarningSplitsDto) {
    return this.earningsService.getEarningSplits(query);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  getSummary(@Query() query: QueryEarningSplitsDto) {
    return this.earningsService.getEarningsSummary(query);
  }
}
