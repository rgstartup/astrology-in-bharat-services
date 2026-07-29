import { AddressDto } from '@/common/address/address.dto';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsString, ValidateNested } from 'class-validator';

export class CreateOrderDto {
  @Type(() => AddressDto)
  @ValidateNested()
  shipping_address!: AddressDto;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  coupon_code?: string;

  @IsOptional()
  @IsString()
  payment_method?: string;

  // Split Payment: Amount to deduct from wallet (remaining will go to Razorpay)
  @IsOptional()
  @IsNumber()
  wallet_amount_to_use?: number;
}
