import { IsOptional, IsString, IsEnum, IsPostalCode } from 'class-validator';
import { AddressTag } from '../entities/address.entity';

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
  houseNo?: string;

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
  zipCode?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsEnum(AddressTag)
  tag?: AddressTag;
}
