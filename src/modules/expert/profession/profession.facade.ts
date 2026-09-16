import { Injectable } from '@nestjs/common';
import { GetProfessionsUseCase } from './use-cases/get-professions.usecase';
import { GetExpertProfessionsUseCase } from './use-cases/get-expert-professions.usecase';
import { SyncExpertProfessionsUseCase } from './use-cases/sync-expert-professions.usecase';
import { GetProfessionsDto, SyncExpertProfessionsDto } from './dto/request/profession.dto';
import { IExpert } from '@/common/types/access-token.payload';

@Injectable()
export class ProfessionFacade {
  constructor(
    private readonly getProfessionsUseCase: GetProfessionsUseCase,
    private readonly getExpertProfessionsUseCase: GetExpertProfessionsUseCase,
    private readonly syncExpertProfessionsUseCase: SyncExpertProfessionsUseCase,
  ) {}

  getProfessions(dto: GetProfessionsDto) {
    return this.getProfessionsUseCase.execute(dto);
  }

  getProfessionById(id: number) {
    return this.getProfessionsUseCase.getById(id);
  }

  getExpertProfessions(expert: IExpert) {
    return this.getExpertProfessionsUseCase.execute(expert);
  }

  syncExpertProfessions(expert: IExpert, dto: SyncExpertProfessionsDto) {
    return this.syncExpertProfessionsUseCase.execute(expert, dto);
  }
}
