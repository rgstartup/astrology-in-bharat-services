import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Profile } from 'passport-google-oauth20';

export class ClientOAuthDto {
  @IsString()
  provider!: string; // "google", "github", etc.

  @IsString()
  provider_id!: string; // provider's user ID

  //   @IsOptional()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  oauthProfile?: Profile // optional raw provider profile


  constructor(partial: Partial<ClientOAuthDto>) {
    Object.assign(this, partial);
  }
}
