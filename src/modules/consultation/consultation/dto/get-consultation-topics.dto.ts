import { PaginationDto } from '@/common/dto/pagination.dto';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class GetConsultationTopicsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsIn(['sort_order', 'title', 'created_at'])
  sort_by?: 'sort_order' | 'title' | 'created_at' = 'sort_order';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';
}
