import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateOrderDto {
  @IsNotEmpty()
  @IsObject()
  shipping_address: any;
}
