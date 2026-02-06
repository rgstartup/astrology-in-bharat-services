import { IsEmail, IsString, MinLength, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { PickType } from '@nestjs/swagger';

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

  @IsOptional()
  @IsBoolean()
  expert?: boolean;
}

export class ForgotPasswordDto extends PickType(RegisterDto, ['email'] as const) {
  @IsOptional()
  @IsString()
  origin?: string;
}

export class ResetPasswordDto extends PickType(RegisterDto, ['password'] as const) { }

export class SendMagicLinkDto extends PickType(RegisterDto, ['email'] as const) { }
