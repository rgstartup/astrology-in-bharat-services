import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsArray,
} from 'class-validator';

export class QueryExpertDto {
  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;

  // Search by expert name
  @IsOptional()
  @IsString()
  q?: string;

  // Filter by specialization (comma-separated or array)
  @IsOptional()
  @IsString()
  specializations?: string;

  // Filter by location (city)
  @IsOptional()
  @IsString()
  location?: string;

  // Filter by minimum rating
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  // Filter by experience level
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minExperience?: number;

  // Filter by languages (comma-separated)
  @IsOptional()
  @IsString()
  languages?: string;

  // Sorting: 'experience' | 'rating' | 'newest' | 'name'
  @IsOptional()
  @IsIn(['experience', 'rating', 'newest', 'name'])
  sort?: string = 'newest';
}
