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

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  country: string;

  @IsPostalCode('any')
  zipCode: string;

  @IsOptional()
  @IsEnum(AddressTag)
  tag?: AddressTag;
}
