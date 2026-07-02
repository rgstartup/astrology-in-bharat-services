import { Injectable } from '@nestjs/common';
import { GetLiveDarshansUseCase } from './use-cases/get-live-darshans.use-case';

@Injectable()
export class LiveDarshanFacade {
  constructor(
    private readonly getLiveDarshansUseCase: GetLiveDarshansUseCase,
  ) {}

  async getLiveDarshans() {
    return this.getLiveDarshansUseCase.execute();
  }
}
