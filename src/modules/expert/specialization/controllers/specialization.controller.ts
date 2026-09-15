import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { GetSpecializationsUseCase } from '../use-cases/get-specializations.usecase';
import { GetSpecializationsDto } from '../dto/request/get-specializations.dto';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentExpert } from '../../auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';

@Controller({
  path: ['specializations', 'expert/specializations'],
  version: '1',
})
export class SpecializationController {
  constructor(
    private readonly getSpecializationsUseCase: GetSpecializationsUseCase,
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
}

