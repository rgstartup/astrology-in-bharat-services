import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InitiateRechargeDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  coupon_code?: string;
}
