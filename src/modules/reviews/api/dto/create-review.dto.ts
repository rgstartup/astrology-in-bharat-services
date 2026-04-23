import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray, IsIn, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsOptional()
  @IsNumber()
  expertId?: number;

  @IsOptional()
  @IsNumber()
  merchantId?: number;

  @IsOptional()
  @IsNumber()
  orderId?: number;

  @IsOptional()
  @IsNumber()
  sessionId?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

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
