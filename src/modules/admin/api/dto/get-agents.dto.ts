import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAgentsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override search?: string;

  @IsOptional()
  @IsString()
  override status?: string;
}
