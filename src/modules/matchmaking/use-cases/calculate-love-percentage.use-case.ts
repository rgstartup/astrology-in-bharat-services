import { Injectable } from '@nestjs/common';
import { LoveCalculatorService } from '../services/love-calculator.service';
import { LoveCalculatorDto } from '../dto/matchmaking.dto';

@Injectable()
export class CalculateLovePercentageUseCase {
  constructor(private readonly loveCalculatorService: LoveCalculatorService) { }

  execute(dto: LoveCalculatorDto) {
    const { yourName, partnerName, yourGender, partnerGender } = dto;
    const result = this.loveCalculatorService.calculateLove(
      yourName,
      partnerName,
      yourGender,
      partnerGender,
    );
    return {
      success: true,
      data: result,
    };
  }
}
