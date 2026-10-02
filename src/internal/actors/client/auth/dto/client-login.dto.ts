import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class ClientLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp?: string;
}

export class GoogleLoginQueryDto {
  @IsUrl({
    require_tld: false,
  })
  redirect_uri!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referral_code?: string;
}
