import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

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
  profile?: any; // optional raw provider profile

  @IsOptional()
  @IsArray()
  @IsEnum(RoleEnum, { each: true })
  roles: RoleEnum[] = [RoleEnum.CLIENT]; // default to client role

  constructor(partial: Partial<OAuthUserDto>) {
    Object.assign(this, partial);
  }
}
