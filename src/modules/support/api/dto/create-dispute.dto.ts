import { IsNotEmpty, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';

export class CreateDisputeDto {
    @IsNotEmpty()
    @IsString()
    type: string;

    @IsOptional()
    @IsNumber()
    itemId?: number;

    @IsOptional()
    @IsNumber()
    orderId?: number;

    @IsOptional()
    @IsNumber()
    consultationId?: number;

    @IsOptional()
    @IsNumber()
    pujaId?: number;

    @IsNotEmpty()
    @IsString()
    category: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsOptional()
    @IsObject()
    itemDetails?: any;
}
