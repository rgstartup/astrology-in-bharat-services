import { AddressDto } from '@/common/dto/address.dto';
import { Type } from 'class-transformer';
import {
  IsArray,
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
  bio?: string;

  @IsNumber()
  @Min(0)
  experience_in_years: number;
<<<<<<< HEAD
  v;
=======
>>>>>>> b17a86780fbf7c57b3e3d48016f4d74752f2e8b3

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
}

export class CreateProfileExpertDto extends ProfileExpertDto {}

export class UpdateProfileExpertDto extends PartialType(ProfileExpertDto) {}
