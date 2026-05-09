import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class MerchantRegisterDto {
  @IsString()
  @IsNotEmpty()
  shopName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString({ each: true })
  roles?: string[] = ['merchant'];
}
