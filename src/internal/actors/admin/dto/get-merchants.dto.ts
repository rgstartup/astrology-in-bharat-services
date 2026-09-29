import { PaginationDto } from '@/shared/dto/pagination.dto';
import { MerchantStatus } from '@/internal/actors/merchant/account/entities/account.entity';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetAdminMerchantsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  declare search?: string;

  @IsOptional()
  @IsEnum(MerchantStatus)
  declare status?: MerchantStatus;
}
