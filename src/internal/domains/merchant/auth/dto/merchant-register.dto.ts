import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class InitiateMerchantRegisterDto {
  @IsEmail()
  email!: string;
}

export class CompleteMerchantRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

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
  description?: string;
}
