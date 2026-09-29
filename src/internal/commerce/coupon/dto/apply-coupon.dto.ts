import { IsOptional, IsString, IsNumber, IsPositive } from 'class-validator';

export class ApplyCouponDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  orderValue?: number;

  @IsOptional()
  @IsString()
  serviceType?: string;
}
