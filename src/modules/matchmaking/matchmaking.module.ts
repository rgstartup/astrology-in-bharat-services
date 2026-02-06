import { Module } from '@nestjs/common';
import { LoveCalculatorService } from './love-calculator.service';
import { MatchmakingController } from './matchmaking.controller';
import { ProkeralaService } from './prokerala.service';

@Module({
  controllers: [MatchmakingController],
  providers: [ProkeralaService, LoveCalculatorService],
  exports: [ProkeralaService, LoveCalculatorService],
})
export class MatchmakingModule {}
