import { Module } from '@nestjs/common';
import { ProkeralaModule } from '@/external/prokerala/prokerala.module';
import { MatchmakingController } from './controllers/matchmaking.controller';
import { MatchmakingFacade } from './matchmaking.facade';
import { CalculateKundliMatchingUseCase } from './use-cases/calculate-kundli-matching.use-case';
import { CalculateLovePercentageUseCase } from './use-cases/calculate-love-percentage.use-case';
import { LoveCalculatorService } from './services/love-calculator.service';

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
