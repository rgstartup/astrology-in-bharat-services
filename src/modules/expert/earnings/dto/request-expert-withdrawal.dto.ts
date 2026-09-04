import { IsNotEmpty, IsNumber } from 'class-validator';

export class RequestExpertWithdrawalDto {
  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsNotEmpty()
  bank_account_id!: string | number;
}
