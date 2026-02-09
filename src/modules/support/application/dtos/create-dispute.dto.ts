import { IsEnum, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';
import { DisputeType } from '../../domain/entities/dispute.entity';

export class CreateDisputeDto {
    @IsEnum(DisputeType)
    type: DisputeType;

    @IsOptional()
    @IsNumber()
    itemId?: number;

    @IsOptional()
    @IsNumber()
    orderId?: number;

    @IsOptional()
    @IsNumber()
    consultationId?: number;

    @IsString()
    category: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsObject()
    itemDetails?: any;
}
