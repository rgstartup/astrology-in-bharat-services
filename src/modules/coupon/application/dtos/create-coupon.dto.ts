import { IsEnum, IsNotEmpty, IsNumber, IsBoolean, IsDateString, IsString, IsOptional, Min } from 'class-validator';
import { CouponType } from '../../domain/entities/coupon';

export class CreateCouponDto {
    @IsString()
    @IsNotEmpty()
    code: string;

    @IsEnum(CouponType)
    type: CouponType;

    @IsNumber()
    @Min(0)
    value: number;

    @IsBoolean()
    @IsOptional()
    isPublic: boolean = false;

    @IsBoolean()
    @IsOptional()
    is_active?: boolean;

    @IsDateString()
    @IsNotEmpty()
    expiry_date: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    min_order_value?: number;

    @IsNumber()
    @IsOptional()
    @Min(1)
    max_usage_limit?: number;

    @IsString()
    @IsOptional()
    applicable_to?: 'product' | 'chat' | 'call' | 'all';
}
