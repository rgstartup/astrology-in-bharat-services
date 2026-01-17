import { Controller, Post, Body } from '@nestjs/common';
import { ProkeralaService } from './prokerala.service';
import { LoveCalculatorService } from './love-calculator.service';
import { GunaMilanRequestDto, LoveCalculatorDto } from './dto/matchmaking.dto';
import { Public } from '@/common/decorators/public.decorator';

@Controller('matchmaking')
export class MatchmakingController {
    constructor(
        private readonly prokeralaService: ProkeralaService,
        private readonly loveCalculatorService: LoveCalculatorService,
    ) { }

    @Public()
    @Post('guna-milan')
    async getGunaMilan(@Body() dto: GunaMilanRequestDto) {
        const result = await this.prokeralaService.getGunaMilan(dto.girl, dto.boy);

        return {
            success: true,
            data: result.data,
        };
    }

    @Public()
    @Post('love-calculator')
    async calculateLove(@Body() dto: LoveCalculatorDto) {
        const result = this.loveCalculatorService.calculateLove(
            dto.yourName,
            dto.partnerName,
            dto.yourGender,
            dto.partnerGender
        );
        return {
            success: true,
            data: result,
        };
    }
}
