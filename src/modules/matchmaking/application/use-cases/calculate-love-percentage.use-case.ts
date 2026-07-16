import { Injectable } from '@nestjs/common';
import { LoveCalculatorService } from '../../infrastructure/services/love-calculator.service';
import { LoveCalculatorDto } from '../../api/dto/matchmaking.dto';

@Injectable()
export class CalculateLovePercentageUseCase {
  constructor(private readonly loveCalculatorService: LoveCalculatorService) {}

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
