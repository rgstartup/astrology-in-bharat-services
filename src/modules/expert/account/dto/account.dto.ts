import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ExpertAccountDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  languages?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experience_in_years?: number;

  @IsOptional()
  @IsString()
  about_me?: string;
}

export class UpdateExpertAccountDto extends PartialType(ExpertAccountDto) {}
