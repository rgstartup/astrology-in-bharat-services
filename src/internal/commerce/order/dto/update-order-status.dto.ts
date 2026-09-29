import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../enum';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
