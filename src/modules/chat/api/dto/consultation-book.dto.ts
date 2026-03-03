import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConsultationBookDto {
    @IsNotEmpty()
    @IsNumber()
    expert_id: number;

    @IsNotEmpty()
    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    astrologer_name?: string;

    @IsOptional()
    @IsString()
    coupon_code?: string;

    @IsOptional()
    @IsString()
    type?: string;
}
