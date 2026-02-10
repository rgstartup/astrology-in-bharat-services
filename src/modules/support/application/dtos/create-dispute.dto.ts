import { IsEnum, IsNumber, IsString, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { DisputeType } from '../../domain/entities/dispute.entity';

export class CreateDisputeDto {
    @IsEnum(DisputeType)
    type: DisputeType;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    itemId?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    orderId?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    consultationId?: number;

    @IsString()
    category: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsObject()
    itemDetails?: any;
}
