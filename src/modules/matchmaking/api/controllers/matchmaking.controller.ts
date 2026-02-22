import { Controller, Post, Body } from '@nestjs/common';
import { GunaMilanRequestDto, LoveCalculatorDto } from '../dto/matchmaking.dto';
import { Public } from '@/common/decorators/public.decorator';
import { MatchmakingFacade } from '../../application/matchmaking.facade';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(
    private readonly matchmakingFacade: MatchmakingFacade,
  ) {}

  @Public()
  @Post('guna-milan')
  async getGunaMilan(@Body() dto: GunaMilanRequestDto) {
     return this.matchmakingFacade.calculateKundliMatching(dto.girl, dto.boy);
  }

  @Public()
  @Post('love-calculator')
  async calculateLove(@Body() dto: LoveCalculatorDto) {
    return this.matchmakingFacade.calculateLovePercentage(
      dto.yourName,
      dto.partnerName,
      dto.yourGender,
      dto.partnerGender,
    );
  }
}
