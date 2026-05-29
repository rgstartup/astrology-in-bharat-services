import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConsultationBookDto {
    @IsNotEmpty()
    @IsString()
    expert_id: string;

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
