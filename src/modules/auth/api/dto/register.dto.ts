// src/auth/dto/register.dto.ts
import { PickType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles: string[] = ['client'];
}

export class ForgotPasswordDto extends PickType(RegisterDto, ['email']) {
  @IsOptional()
  @IsString()
  origin?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  confirm_password?: string;
}

export class SendMagicLinkDto extends PickType(RegisterDto, ['email']) { }


