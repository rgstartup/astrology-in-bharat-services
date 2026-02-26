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
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

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

export class ForgotPasswordDto extends PickType(RegisterDto, ['email']) { }

export class ResetPasswordDto extends PickType(RegisterDto, ['password']) { }

export class SendMagicLinkDto extends PickType(RegisterDto, ['email']) { }
