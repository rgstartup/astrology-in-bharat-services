import { Injectable } from '@nestjs/common';
import { CalculateKundliMatchingUseCase } from './use-cases/calculate-kundli-matching.use-case';
import { CalculateLovePercentageUseCase } from './use-cases/calculate-love-percentage.use-case';
import { GunaMilanRequestDto, LoveCalculatorDto } from '../api/dto/matchmaking.dto';

@Injectable()
export class MatchmakingFacade {
  constructor(
    private readonly calculateKundliMatchingUseCase: CalculateKundliMatchingUseCase,
    private readonly calculateLovePercentageUseCase: CalculateLovePercentageUseCase,
  ) {}

  async calculateKundliMatching(dto: GunaMilanRequestDto) {
    return this.calculateKundliMatchingUseCase.execute(dto);
  }

  calculateLovePercentage(dto: LoveCalculatorDto) {
    return this.calculateLovePercentageUseCase.execute(dto);
  }
}
