import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { MerchantStatus } from '../../entities/account.entity';

export class MerchantAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  shop_name?: string;

  @IsOptional()
  @IsString()
  manager_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  video?: string;

  @IsOptional()
  @IsString()
  established?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  gallery?: string[];

  @IsOptional()
  @IsArray()
  features?: string[];

  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsOptional()
  @IsBoolean()
  is_gst_exempt?: boolean;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  account_holder?: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsOptional()
  @IsString()
  ifsc?: string;

  @IsOptional()
  @IsString()
  gst_certificate?: string;

  @IsOptional()
  @IsString()
  pan_front?: string;

  @IsOptional()
  @IsString()
  pan_back?: string;

  @IsOptional()
  @IsString()
  aadhar_front?: string;

  @IsOptional()
  @IsString()
  aadhar_back?: string;

  @IsOptional()
  @IsString()
  operational_hours?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

export class CreateMerchantAccountDto extends MerchantAccountDto {}

export class UpdateMerchantAccountDto extends PartialType(MerchantAccountDto) {}

export class UpdateMerchantStatusDto {
  @IsOptional()
  @IsBoolean()
  is_online?: boolean;

  @IsOptional()
  @IsEnum(MerchantStatus)
  status?: MerchantStatus;
}
