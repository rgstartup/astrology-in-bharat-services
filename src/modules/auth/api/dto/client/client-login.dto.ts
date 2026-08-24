import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class ClientLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class GoogleLoginQueryDto {
  @IsEnum(RoleEnum, {
    message: 'Please provide a valid role',
  })
  role!: RoleEnum;

  @IsUrl({
    require_tld: false,
  })
  redirect_uri!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referral_code?: string;
}
