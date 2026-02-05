import { IsOptional, IsString } from 'class-validator';

export class VerifyPaymentDto {
    @IsString()
    razorpay_order_id: string;

    @IsString()
    razorpay_payment_id: string;

    @IsOptional()
    @IsString()
    razorpay_signature?: string;

    @IsOptional()
    shippingAddress?: any;

    @IsOptional()
    notes?: any;

    @IsOptional()
    type?: string;
}
