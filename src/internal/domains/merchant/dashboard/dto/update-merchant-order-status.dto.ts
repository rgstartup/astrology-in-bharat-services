import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@/internal/commerce/order/enum';

export class UpdateMerchantOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
