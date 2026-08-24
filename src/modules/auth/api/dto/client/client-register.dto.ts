import {
    IsEmail,
    IsString,
    IsOptional,
    ValidateNested,
    IsNotEmpty,
    IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from '@/common/address/address.dto';

export class InitiateClientRegisterDto {
    @IsEmail()
    email!: string;
}


class BirthDetailsDto {
    @IsString()
    @IsNotEmpty()
    dateOfBirth!: string;

    @IsString()
    @IsNotEmpty()
    timeOfBirth!: string;

    @IsString()
    @IsNotEmpty()
    birthPlace!: string;
}

export class CompleteClientRegisterDto {
    @IsString()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    token!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsString()
    @IsNotEmpty()
    full_name!: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsOptional()
    @IsIn(['male', 'female', 'other'])
    gender?: 'male' | 'female' | 'other';

    @IsString()
    @IsOptional()
    maritalStatus?: string;

    @IsString()
    @IsOptional()
    occupation?: string;

    @IsString()
    @IsOptional()
    aboutMe?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AddressDto)
    address?: AddressDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => BirthDetailsDto)
    birthDetails?: BirthDetailsDto;
}
