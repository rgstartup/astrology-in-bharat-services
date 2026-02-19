import { AddressDto } from '@/common/address/address.dto';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class ProfileClientDto {
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  @IsString()
  profile_picture?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}

// Create profile
export class CreateProfileClientDto extends ProfileClientDto {}

// Update profile
export class UpdateProfileClientDto extends PartialType(ProfileClientDto) {}
