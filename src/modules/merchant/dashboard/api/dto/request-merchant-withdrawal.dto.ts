import { IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class RequestMerchantWithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  bankAccountId: string | number;
}
