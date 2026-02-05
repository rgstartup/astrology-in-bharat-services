import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateOrderDto {
    @IsNumber()
    @Min(1)
    amount: number; // in rupees

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    notes?: Record<string, any>;
}
