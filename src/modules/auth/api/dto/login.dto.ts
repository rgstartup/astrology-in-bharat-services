import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsEnum(RoleEnum)
  requiredRole!: RoleEnum;
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

  @IsEnum(RoleEnum)
  @IsOptional()
  role: RoleEnum = RoleEnum.CLIENT;
}
