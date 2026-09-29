import { PaginationDto } from '../../../shared/dto/pagination.dto';
import { WithdrawalStatus } from '../../finance/wallet/enum';
import { RoleEnum } from '../../users/enums/Role.enum';
import { IsEnum, IsOptional } from 'class-validator';

export class GetWithdrawalsDto extends PaginationDto {
  @IsOptional()
  @IsEnum(WithdrawalStatus)
  declare status?: WithdrawalStatus;

  @IsOptional()
  @IsEnum(RoleEnum)
  declare role?: RoleEnum;
}
