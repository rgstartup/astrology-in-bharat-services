import { WithdrawalStatus } from '@/internal/finance/wallet/enum';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWithdrawalStatusDto {
  @IsNotEmpty()
  @IsEnum(WithdrawalStatus)
  status!: WithdrawalStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}
