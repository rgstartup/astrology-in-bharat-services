import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ListingType } from '../../domain/entities/agent-listing.entity';

export class CreateListingDto {
    @ApiProperty({ enum: ListingType, example: 'mandir' })
    @IsEnum(ListingType)
    @IsNotEmpty()
    type: ListingType;

    @ApiProperty({ example: 'Shiv Mandir' })
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ example: 'Varanasi, UP', required: false })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({ example: '9876543210', required: false })
    @IsOptional()
    @IsString()
    phone?: string;

    // Mandir specific
    @ApiProperty({ example: 'Lord Shiva', required: false })
    @IsOptional()
    @IsString()
    deity?: string;

    // Astrologer specific
    @ApiProperty({ example: 'Vedic Astrology', required: false })
    @IsOptional()
    @IsString()
    specialization?: string;

    // Puja Shop specific
    @ApiProperty({ example: 'Flowers, Incense, Idols', required: false })
    @IsOptional()
    @IsString()
    items?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;
}
