import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  MinLength,
} from 'class-validator';

export class InitiateClientRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  first_name!: string;

  @IsString()
  @IsOptional()
  last_name?: string;
}

export class CompleteClientRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp!: string;
}
