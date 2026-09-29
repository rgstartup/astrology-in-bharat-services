import { PaginationDto } from '@/shared/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class GetExpertsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  declare search?: string;

  @IsOptional()
  @IsString()
  declare status?: string;
}
