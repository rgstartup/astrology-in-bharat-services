import { Module } from '@nestjs/common';
import { MatchmakingController } from './matchmaking.controller';
import { ProkeralaService } from './prokerala.service';
import { LoveCalculatorService } from './love-calculator.service';

@Module({
  controllers: [MatchmakingController],
  providers: [ProkeralaService, LoveCalculatorService],
  exports: [ProkeralaService, LoveCalculatorService],
})
export class MatchmakingModule {}
