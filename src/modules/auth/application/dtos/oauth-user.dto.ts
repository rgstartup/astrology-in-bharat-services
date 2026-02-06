import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class OAuthUserDto {
  @IsString()
  provider: string; // "google", "github", etc.

  @IsString()
  providerId: string; // provider's user ID

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  profile?: any; // optional raw provider profile

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  constructor(partial: Partial<OAuthUserDto>) {
    Object.assign(this, partial);
    // Set default roles if not provided
    if (!this.roles || this.roles.length === 0) {
      if (this.role) {
        this.roles = [this.role];
      } else {
        this.roles = ['client'];
      }
    }
  }
}
