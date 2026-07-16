import { PaginationDto } from '@/common/dto/pagination.dto';
import { WithdrawalStatus } from '@/modules/finance/wallet/infrastructure/entities/withdrawal.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IsEnum, IsOptional } from 'class-validator';

export class GetWithdrawalsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  override status?: WithdrawalStatus;

  @IsOptional()
  @IsEnum(RoleEnum)
  override role?: RoleEnum;
}
