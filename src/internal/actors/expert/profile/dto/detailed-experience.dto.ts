import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DetailedExperienceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateExperienceExpertDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedExperienceDto)
  detailed_experience?: DetailedExperienceDto[];

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}
