import { IsOptional, IsString, IsPostalCode, IsEnum } from 'class-validator';
import { AddressTag } from './address.entity';

export class AddressDto {
  @IsOptional()
  id?: number;

  @IsString()
  line1: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsOptional()
  @IsString()
  house_no?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsPostalCode('any')
  zip_code?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsEnum(AddressTag)
  tag?: AddressTag;
}
