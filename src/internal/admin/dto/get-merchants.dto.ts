import { PaginationDto } from '@/shared/dto/pagination.dto';
import { MerchantStatus } from '@/internal/domains/merchant/account/entities/account.entity';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetAdminMerchantsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override search?: string;

  @IsOptional()
  @IsEnum(MerchantStatus)
  override status?: MerchantStatus;
}
