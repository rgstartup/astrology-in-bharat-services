import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../../../../shared/decorators/public.decorator';
import { GetSpecializationsUseCase } from '../use-cases/get-specializations.usecase';
import { SyncExpertSpecializationsUseCase } from '../use-cases/sync-expert-specializations.usecase';
import { GetSpecializationsDto } from '../dto/request/get-specializations.dto';
import { SyncExpertSpecializationsDto } from '../dto/request/sync-expert-specializations.dto';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentExpert } from '../../auth/decorators/current-expert.decorator';
import { type IExpert } from '../../../../../shared/types/access-token.payload';

@Controller({
  path: ['specializations', 'expert/specializations'],
  version: '1',
})
export class SpecializationController {
  constructor(
    private readonly getSpecializationsUseCase: GetSpecializationsUseCase,
    private readonly syncExpertSpecializationsUseCase: SyncExpertSpecializationsUseCase,
  ) {}

  @Public()
  @Get()
  async getSpecializations(@Query() dto: GetSpecializationsDto) {
    return this.getSpecializationsUseCase.execute(dto);
  }

  @UseGuards(ExpertJwtAuthGuard)
  @Get('available')
  async getAvailableSpecializations(@CurrentExpert() expert: IExpert) {
    return this.getSpecializationsUseCase.getAvailableForExpert(expert.sub);
  }

  @UseGuards(ExpertJwtAuthGuard)
  @Put('me')
  async syncMySpecializations(
    @CurrentExpert() expert: IExpert,
    @Body() dto: SyncExpertSpecializationsDto,
  ) {
    return this.syncExpertSpecializationsUseCase.execute(expert, dto);
  }
}
