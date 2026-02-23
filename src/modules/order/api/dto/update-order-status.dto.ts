import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../infrastructure/persistence/entities/order.entity';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
