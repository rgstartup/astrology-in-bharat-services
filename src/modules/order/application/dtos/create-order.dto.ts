import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
    @IsNotEmpty()
    @IsObject()
    shippingAddress: any;

    @IsOptional()
    @IsString()
    couponCode?: string;
}
