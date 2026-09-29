import { Controller, Post, Body } from '@nestjs/common';
import { GunaMilanRequestDto, LoveCalculatorDto } from '../dto/matchmaking.dto';
import { Public } from '../../../shared/decorators/public.decorator';
import { MatchmakingService } from '../matchmaking.service';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Public()
  @Post('guna-milan')
  async getGunaMilan(@Body() dto: GunaMilanRequestDto) {
    return this.matchmakingService.calculateKundliMatching(dto);
  }

  @Public()
  @Post('love-calculator')
  // eslint-disable-next-line @typescript-eslint/require-await
  async calculateLove(@Body() dto: LoveCalculatorDto) {
    return this.matchmakingService.calculateLovePercentage(dto);
  }
}
