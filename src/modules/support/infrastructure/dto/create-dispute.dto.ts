import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDisputeDto {
    @IsNotEmpty()
    @IsString()
    subject: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsOptional()
    @IsNumber()
    order_id?: number;
}
