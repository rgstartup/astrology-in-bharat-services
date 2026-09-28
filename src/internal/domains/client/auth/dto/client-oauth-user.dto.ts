import {
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';
import { Profile } from 'passport-google-oauth20';

export class ClientOAuthDto {
  @IsString()
  provider!: string;

  @IsString()
  provider_id!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  oauthProfile?: Profile;

  constructor(partial: Partial<ClientOAuthDto>) {
    Object.assign(this, partial);
  }
}
