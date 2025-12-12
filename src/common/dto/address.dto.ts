import { IsOptional, IsString, IsEnum } from 'class-validator';
import { AddressTag } from '../entities/address.entity';

export class AddressDto {
  @IsString()
  street: string;

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
