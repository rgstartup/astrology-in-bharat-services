import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Profile } from 'passport-google-oauth20';

export class OAuthUserDto {
  @IsString()
  provider!: string; // "google", "github", etc.

  @IsString()
  provider_id!: string; // provider's user ID

  //   @IsOptional()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  profile?: Profile // optional raw provider profile

  @IsOptional()
  @IsEnum(RoleEnum)
  role: RoleEnum; // default to client role

  constructor(partial: Partial<OAuthUserDto>) {
    Object.assign(this, partial);
  }
}
