import { Controller, Post, Body } from '@nestjs/common';
import { GunaMilanRequestDto, LoveCalculatorDto } from '../dto/matchmaking.dto';
import { Public } from '@/common/decorators/public.decorator';
import { MatchmakingFacade } from '../../application/matchmaking.facade';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly matchmakingFacade: MatchmakingFacade) {}

  @Public()
  @Post('guna-milan')
  async getGunaMilan(@Body() dto: GunaMilanRequestDto) {
    return this.matchmakingFacade.calculateKundliMatching(dto);
  }

  @Public()
  @Post('love-calculator')
  // eslint-disable-next-line @typescript-eslint/require-await
  async calculateLove(@Body() dto: LoveCalculatorDto) {
    return this.matchmakingFacade.calculateLovePercentage(dto);
  }
}
