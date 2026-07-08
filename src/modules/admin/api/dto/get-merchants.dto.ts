import { PaginationDto } from '@/common/dto/pagination.dto';
import { MerchantStatus } from '@/modules/merchant/profile/infrastructure/entities/profile-merchant.entity';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetAdminMerchantsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override search?: string;

  @IsOptional()
  @IsEnum(MerchantStatus)
  override status?: MerchantStatus;
}
