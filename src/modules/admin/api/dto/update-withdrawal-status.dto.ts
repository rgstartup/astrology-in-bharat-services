import { WithdrawalStatus } from '@/modules/finance/wallet/infrastructure/entities/withdrawal.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateWithdrawalStatusDto {
  @IsNotEmpty()
  @IsEnum(WithdrawalStatus)
  status!: WithdrawalStatus;

  @IsOptional()
  @IsString()
  remark?: string;
}
