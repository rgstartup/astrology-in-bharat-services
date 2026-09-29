import { Module } from '@nestjs/common';
import { ProkeralaModule } from '../../external/prokerala/prokerala.module';
import { MatchmakingController } from './controllers/matchmaking.controller';
import { MatchmakingService } from './matchmaking.service';
import { CalculateKundliMatchingUseCase } from './use-cases/calculate-kundli-matching.use-case';
import { CalculateLovePercentageUseCase } from './use-cases/calculate-love-percentage.use-case';
import { LoveCalculatorService } from './services/love-calculator.service';

@Module({
  imports: [ProkeralaModule],
  controllers: [MatchmakingController],
  providers: [
    MatchmakingService,
    CalculateKundliMatchingUseCase,
    CalculateLovePercentageUseCase,
    LoveCalculatorService,
  ],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
