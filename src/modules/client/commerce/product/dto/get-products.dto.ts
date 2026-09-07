import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class GetProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @IsUUID()
  merchantId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  expert_id?: string;
}
