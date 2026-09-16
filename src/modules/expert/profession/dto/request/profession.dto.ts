import ToBoolean from '@/common/decorators/transform/bool.transform';
import TrimString from '@/common/decorators/transform/trim.transform';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetProfessionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @TrimString()
  search?: string;

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

export class CreateProfessionDto {
  @IsNotEmpty()
  @IsString()
  @TrimString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  @TrimString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @IsOptional()
  sort_order?: number = 0;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  specialization_ids?: number[];
}

export class UpdateProfessionDto {
  @IsOptional()
  @IsString()
  @TrimString()
  title?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  sort_order?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  specialization_ids?: number[];
}

export class SyncExpertProfessionsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  profession_ids!: number[];

  @IsOptional()
  @IsNumber()
  primary_profession_id?: number;
}
