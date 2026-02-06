import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min, Max, IsIn, IsArray } from 'class-validator';

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

  // Filter by state
  @IsOptional()
  @IsString()
  state?: string;

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

  // Filter by price range
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  // Sorting: 'experience' | 'rating' | 'newest' | 'name' | 'price_asc' | 'price_desc' | 'none'
  @IsOptional()
  @IsIn([
    'experience',
    'rating',
    'newest',
    'name',
    'price_asc',
    'price_desc',
    'none',
  ])
  sort?: string = 'newest';

  // Filter by online/available status
  @IsOptional()
  @IsString()
  onlineOnly?: string;

  // New filters
  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  online?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}
