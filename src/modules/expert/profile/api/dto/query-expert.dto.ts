import TrimString from '@/common/decorators/transform/trim.transform';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryExpertDto extends PaginationDto {
  // Search by expert name
  @IsOptional()
  @IsString()
  @TrimString()
  q?: string;

  // Filter by specialization (comma-separated or array)
  @IsOptional()
  @IsString()
  @TrimString()
  specializations?: string;

  // Filter by location (city)
  @IsOptional()
  @IsString()
  @TrimString()
  location?: string;

  // Filter by state
  @IsOptional()
  @IsString()
  @TrimString()
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
  @TrimString()
  onlineOnly?: string;

  // New filters
  @IsOptional()
  @IsString()
  @TrimString()
  service?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  online?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;
}
