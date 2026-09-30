import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class ExpertLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp?: string;
}
