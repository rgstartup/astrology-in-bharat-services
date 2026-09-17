import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import TrimString from '@/common/decorators/transform/trim.transform';

export class FindFavoriteExpertsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;
}
