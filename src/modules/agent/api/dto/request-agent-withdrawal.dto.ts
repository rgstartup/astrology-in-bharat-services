import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class RequestAgentWithdrawalDto {
  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsNotEmpty()
  bank_account_id!: string | number;
}
