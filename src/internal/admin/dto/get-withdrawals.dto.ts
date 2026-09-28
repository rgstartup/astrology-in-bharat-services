import { PaginationDto } from '@/shared/dto/pagination.dto';
import { WithdrawalStatus } from '@/internal/finance/wallet/enum';
import { RoleEnum } from '@/internal/users/enums/Role.enum';
import { IsEnum, IsOptional } from 'class-validator';

export class GetWithdrawalsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  override status?: WithdrawalStatus;

  @IsOptional()
  @IsEnum(RoleEnum)
  override role?: RoleEnum;
}
