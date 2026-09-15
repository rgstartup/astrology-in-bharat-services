import ToBoolean from '@/common/decorators/transform/bool.transform';
import TrimString from '@/common/decorators/transform/trim.transform';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class GetSpecializationsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  profession_id?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  profession_slug?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  profession_ids?: string[];

  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsIn(['sort_order', 'title', 'slug', 'created_at'])
  sort_by?: 'sort_order' | 'title' | 'slug' | 'created_at' = 'sort_order';

  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  order?: 'ASC' | 'DESC' | 'asc' | 'desc' = 'ASC';
}

