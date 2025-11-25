import { IsOptional, IsString, IsPostalCode, IsBoolean } from 'class-validator';

export class AddressDto {
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

  // Allow any postal code format (handles numeric and mixed formats across countries)
  @IsPostalCode('any')
  zipCode: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
