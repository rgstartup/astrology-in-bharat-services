import { IsString, IsOptional, Matches, IsNotEmpty } from 'class-validator';

export class UpdateMerchantProfileDto {
  @IsString({ message: 'Store name must be a string' })
  @IsNotEmpty({ message: 'Store name is required' })
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsString()
  shopName?: string;

  @IsString({ message: 'Manager name must be a string' })
  @IsOptional()
  managerName?: string;

  @IsString({ message: 'Invalid mobile number format' })
  @IsOptional()
  @Matches(/^[0-9]{10}$/, { message: 'Invalid mobile number format' })
  phone?: string;

  @IsString({ message: 'Address must be a string' })
  @IsOptional()
  address?: string;

  @IsString({ message: 'City must be a string' })
  @IsOptional()
  city?: string;

  @IsString({ message: 'Pincode should be exactly 6 digits' })
  @IsOptional()
  @Matches(/^[0-9]{6}$/, { message: 'Pincode should be exactly 6 digits' })
  pincode?: string;

  @IsOptional()
  isOnline?: any;

  @IsOptional()
  @IsString()
  operationalHours?: string;

  @IsOptional()
  @IsString()
  trustScore?: string;

  @IsOptional()
  latitude?: string | number;

  @IsOptional()
  longitude?: string | number;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, {
    message: 'Invalid PAN card format',
  })
  pan?: string;

  @IsOptional()
  isGstExempt?: any;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountHolder?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: 'Invalid IFSC code format' })
  ifsc?: string;

  @IsOptional()
  @IsString()
  bank_accounts?: string;
}
