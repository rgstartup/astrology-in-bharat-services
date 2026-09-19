// src/users/dto/create-user.dto.ts

import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoleEnum } from '../enums/Role.enum';
import { PlatformEnum } from '../enums/Platform.enum';

class UserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsDateString()
  email_verified_at?: Date;

  @IsOptional()
  @IsEnum(RoleEnum)
  role: RoleEnum = RoleEnum.CLIENT;

  @IsOptional()
  @IsEnum(PlatformEnum)
  platform: PlatformEnum;

  /**
   * @deprecated Use `avatar_id` instead to link to the Media entity.
   */
  @IsString()
  @IsOptional()
  avatar?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  avatar_id?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  referred_by_id?: number | null;
}

export class CreateUserDto extends UserDto { }
