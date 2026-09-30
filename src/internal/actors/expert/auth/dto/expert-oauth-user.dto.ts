import { IsEmail, IsOptional, IsString } from 'class-validator';
import type { Profile } from 'passport-google-oauth20';

export class ExpertOAuthDto {
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

  constructor(partial: Partial<ExpertOAuthDto>) {
    Object.assign(this, partial);
  }
}
