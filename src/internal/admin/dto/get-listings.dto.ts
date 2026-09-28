import { PaginationDto } from '@/shared/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAdminListingsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override type?: string;

  @IsOptional()
  @IsString()
  override search?: string;
}
