import { IsString, IsNumber, IsISO8601, ValidateNested, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
    @IsNumber()
    lat: number;

    @IsNumber()
    lon: number;

    @IsNumber()
    tz: number;
}

export class PersonDetailsDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsISO8601()
    datetime: string;

    @ValidateNested()
    @Type(() => LocationDto)
    location: LocationDto;
}

export class GunaMilanRequestDto {
    @ValidateNested()
    @Type(() => PersonDetailsDto)
    girl: PersonDetailsDto;

    @ValidateNested()
    @Type(() => PersonDetailsDto)
    boy: PersonDetailsDto;
}

export class LoveCalculatorDto {
    @IsString()
    @IsNotEmpty()
    yourName: string;

    @IsString()
    @IsNotEmpty()
    partnerName: string;

    @IsString()
    @IsOptional()
    yourGender?: string;

    @IsString()
    @IsOptional()
    partnerGender?: string;
}
