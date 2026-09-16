import TrimString from '@/common/decorators/transform/trim.transform';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class FindFavoritesDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string | undefined;
}
