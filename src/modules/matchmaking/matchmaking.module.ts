import { Module } from '@nestjs/common';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';
import { MatchmakingController } from './api/controllers/matchmaking.controller';
import { MatchmakingFacade } from './application/matchmaking.facade';
import { CalculateKundliMatchingUseCase } from './application/use-cases/calculate-kundli-matching.use-case';
import { CalculateLovePercentageUseCase } from './application/use-cases/calculate-love-percentage.use-case';
import { LoveCalculatorService } from './infrastructure/services/love-calculator.service';

@Module({
  imports: [ProkeralaModule],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingFacade,
    CalculateKundliMatchingUseCase,
    CalculateLovePercentageUseCase,
    LoveCalculatorService,
  ],
  exports: [MatchmakingFacade],
})
export class MatchmakingModule {}
