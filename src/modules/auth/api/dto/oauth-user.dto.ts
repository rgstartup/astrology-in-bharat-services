import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

export class OAuthUserDto {
  @IsString()
  provider: string; // "google", "github", etc.

  @IsString()
  provider_id: string; // provider's user ID

  //   @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

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
      this.roles = ['client'];
    }
  }
}
