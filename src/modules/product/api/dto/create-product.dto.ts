import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  original_price?: number;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  short_description?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  expert_id?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
