import { IsNotEmpty, IsObject, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsObject()
  shipping_address?: any;

  @IsOptional()
  @IsNumber()
  product_id?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;
}
