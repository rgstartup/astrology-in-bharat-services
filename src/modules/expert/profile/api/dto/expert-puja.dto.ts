import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SamagriItemDto {
  @IsString()
  name: string;

  @IsString()
  quantity: string;
}

export class ExpertPujaDto {
  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @IsBoolean()
  is_home_visit?: boolean;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  min_duration_hours: number;

  @IsNumber()
  @Min(0)
  max_duration_hours: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  online_cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  home_visit_with_samagri_cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  home_visit_without_samagri_cost?: number;

  @IsOptional()
  @IsString()
  puja_image?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  districts?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SamagriItemDto)
  samagri_list?: SamagriItemDto[];
}
