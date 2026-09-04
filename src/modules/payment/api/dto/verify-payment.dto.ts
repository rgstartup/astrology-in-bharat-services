import { AddressDto } from '@/common/address/address.dto';
import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

export class VerifyPaymentDto {
  @IsString()
  razorpay_order_id: string;

  @IsString()
  razorpay_payment_id: string;

  @IsOptional()
  @IsString()
  razorpay_signature?: string;

  @IsOptional()
  @Type(() => AddressDto)
  @ValidateNested()
  shipping_address?: AddressDto;

  @IsOptional()
  notes?: Record<string, unknown>;

  @IsOptional()
  type?: string;
}
