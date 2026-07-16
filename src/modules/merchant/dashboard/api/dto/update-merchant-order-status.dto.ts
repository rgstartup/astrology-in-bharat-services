import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@/modules/commerce/order/infrastructure/entities/order.entity';

export class UpdateMerchantOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
