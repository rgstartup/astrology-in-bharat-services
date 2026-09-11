import ToBoolean from '@/common/decorators/transform/bool.transform';
import TrimString from '@/common/decorators/transform/trim.transform';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class GetConsultationTopicsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsIn(['sort_order', 'title', 'created_at'])
  sort_by?: 'sort_order' | 'title' | 'created_at' = 'sort_order';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';
}
