import { AddressDto } from '@/common/dto/address.dto';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other',
}

export class ProfileExpertDto {
  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  specialization: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsNumber()
  @Min(0)
  experience_in_years: number;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string; // optional if you want to allow DOB for experts too

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  bank_details?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificates?: string[];

  @IsOptional()
  @IsArray()
  detailed_experience?: Record<string, any>[];
}

export class CreateProfileExpertDto extends ProfileExpertDto { }

export class UpdateProfileExpertDto extends PartialType(ProfileExpertDto) { }
