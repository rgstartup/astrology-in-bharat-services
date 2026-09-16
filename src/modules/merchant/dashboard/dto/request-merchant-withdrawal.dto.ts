import { IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestMerchantWithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  bankAccountId: number;
}
