import { Injectable } from '@nestjs/common';
import { CalculateKundliMatchingUseCase } from './use-cases/calculate-kundli-matching.use-case';
import { CalculateLovePercentageUseCase } from './use-cases/calculate-love-percentage.use-case';

@Injectable()
export class MatchmakingFacade {
  constructor(
    private readonly calculateKundliMatchingUseCase: CalculateKundliMatchingUseCase,
    private readonly calculateLovePercentageUseCase: CalculateLovePercentageUseCase,
  ) {}

  async calculateKundliMatching(
    girl: Record<string, any>,
    boy: Record<string, any>,
  ) {
    return this.calculateKundliMatchingUseCase.execute(
      girl as any,
      boy as any,
    );
  }

  calculateLovePercentage(
    yourName: string,
    partnerName: string,
    yourGender?: string,
    partnerGender?: string,
  ) {
    return this.calculateLovePercentageUseCase.execute(
      yourName,
      partnerName,
      yourGender,
      partnerGender,
    );
  }
}
