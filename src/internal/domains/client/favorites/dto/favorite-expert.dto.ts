import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../../../shared/dto/pagination.dto';
import TrimString from '../../../../../shared/decorators/transform/trim.transform';

export class FindFavoriteExpertsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @TrimString()
  declare search?: string;
}
