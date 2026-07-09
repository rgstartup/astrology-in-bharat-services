import { AddressDto } from '@/common/address/address.dto';
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
import { ExpertDocumentDto } from './expert-document.dto';
import { DetailedExperienceDto } from './detailed-experience.dto';
import { CustomServiceDto } from './customer-service.dto';

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
  name?: string;

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
  @IsString()
  phone_number?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chat_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  call_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  video_call_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  report_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  horoscope_price?: number;

  @IsOptional()
  @IsString()
  bank_details?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpertDocumentDto)
  documents?: ExpertDocumentDto[];

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
  @IsString()
  video?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetailedExperienceDto)
  detailed_experience?: DetailedExperienceDto[];

  @IsOptional()
  @IsBoolean()
  expert?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomServiceDto)
  custom_services?: CustomServiceDto[];
}
export class CreateProfileExpertDto extends ProfileExpertDto {}

export class UpdateProfileExpertDto extends PartialType(ProfileExpertDto) {
  @IsOptional()
  @IsString()
  video?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chat_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  call_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  video_call_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  report_price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  horoscope_price?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomServiceDto)
  custom_services?: CustomServiceDto[];
}
