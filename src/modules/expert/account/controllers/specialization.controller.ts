import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { GetSpecializationsUseCase } from '../use-cases/get-specializations.usecase';
import { GetSpecializationsDto } from '../dto/request/get-specializations.dto';

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
}
