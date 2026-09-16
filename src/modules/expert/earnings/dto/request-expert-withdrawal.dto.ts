import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class RequestExpertWithdrawalDto {
  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  bank_account_id!: number;
}
