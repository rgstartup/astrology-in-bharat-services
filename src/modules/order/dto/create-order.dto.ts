import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateOrderDto {
    @IsNotEmpty()
    @IsObject()
    shippingAddress: any;
}
