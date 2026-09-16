import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  IsIn,
  Max,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expert_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  merchantId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionId?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['expert', 'merchant', 'platform'])
  review_type?: string;
}
