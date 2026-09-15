import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MerchantStatus } from '../../entities/account.entity';

export class QueryMerchantDto extends PaginationDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;

  @IsOptional()
  @IsString()
  is_online?: string;
}
