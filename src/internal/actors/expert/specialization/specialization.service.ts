import { Injectable } from '@nestjs/common';
import { GetSpecializationsUseCase } from './use-cases/get-specializations.usecase';
import { SyncExpertSpecializationsUseCase } from './use-cases/sync-expert-specializations.usecase';
import { GetSpecializationsDto } from './dto/request/get-specializations.dto';
import { SyncExpertSpecializationsDto } from './dto/request/sync-expert-specializations.dto';
import { type IExpert } from '@/shared/types/access-token.payload';

@Injectable()
export class SpecializationService {
  constructor(
    private readonly getSpecializationsUseCase: GetSpecializationsUseCase,
    private readonly syncExpertSpecializationsUseCase: SyncExpertSpecializationsUseCase,
  ) {}

  getSpecializations(dto: GetSpecializationsDto) {
    return this.getSpecializationsUseCase.execute(dto);
  }

  syncExpertSpecializations(expert: IExpert, dto: SyncExpertSpecializationsDto) {
    return this.syncExpertSpecializationsUseCase.execute(expert, dto);
  }
}
