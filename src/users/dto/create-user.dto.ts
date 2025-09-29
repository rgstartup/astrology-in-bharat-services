import {
  isAlpha,
  IsAlpha,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import type { UserMetadata } from 'schema/auth.schema';
import { Roles } from 'schema/helper';

class UserMetadataDto implements UserMetadata {
  @IsArray()
  @IsIn(Object.values(Roles), { each: true })
  roles: string[];

  @IsOptional()
  @IsString()
  lang?: string | undefined;
}

export class CreateUserWithEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsAlpha()
  name: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  image?: string | undefined;

  @IsOptional()
  @IsString()
  callbackURL?: string | undefined;

  @IsOptional()
  @IsString()
  rememberMe?: boolean | undefined;

  metadata: UserMetadataDto;
}
