import { Injectable } from '@nestjs/common';
import { LoveCalculatorService } from '../../infrastructure/services/love-calculator.service';

@Injectable()
export class CalculateLovePercentageUseCase {
  constructor(private readonly loveCalculatorService: LoveCalculatorService) {}

  execute(
    yourName: string,
    partnerName: string,
    yourGender?: string,
    partnerGender?: string,
  ) {
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
