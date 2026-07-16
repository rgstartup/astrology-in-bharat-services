import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetClientsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override search?: string;
}
