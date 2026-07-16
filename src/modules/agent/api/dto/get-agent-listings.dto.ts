import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetAgentListingsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  override type?: string;

  @IsOptional()
  @IsString()
  override search?: string;
}
