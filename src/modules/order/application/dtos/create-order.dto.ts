import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
    @IsNotEmpty()
    @IsObject()
    shippingAddress: any;

    @IsOptional()
    @IsString()
    couponCode?: string;

    @IsOptional()
    @IsNumber()
    productId?: number;

    @IsOptional()
    @IsNumber()
    quantity?: number;
}
