import { Injectable } from '@nestjs/common';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';
import { GetSpecializationsDto } from './dto/request/get-specializations.dto';

@Injectable()
export class SpecializationFacade {
  constructor(
    private readonly getSpecializationsUseCase: GetSpecializationsUseCase,
  ) {}

  getSpecializations(dto: GetSpecializationsDto) {
    return this.getSpecializationsUseCase.execute(dto);
  }
}
