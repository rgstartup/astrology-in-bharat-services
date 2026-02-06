import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AddressDto } from '@/common/interfaces/dtos/address.dto';

export class ProfileClientDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  time_of_birth?: string;

  @IsOptional()
  @IsString()
  place_of_birth?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  @IsString()
  language_preference?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;

  @IsOptional()
  @IsString()
  marital_status?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  about_me?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}

// Create profile
export class CreateProfileClientDto extends ProfileClientDto { }

// Update profile
export class UpdateProfileClientDto extends PartialType(ProfileClientDto) { }
