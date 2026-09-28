import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateDisputeDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  itemId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  orderId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  consultationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pujaId?: number;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsOptional()
  itemDetails?: Record<string, unknown>;
}
