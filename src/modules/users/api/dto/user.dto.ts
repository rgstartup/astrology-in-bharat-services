// src/users/dto/create-user.dto.ts

import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleEnum } from '../../infrastructure/enums/Role.enum';

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
  @IsString({ each: true })
  roles?: RoleEnum[];

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsOptional()
  @IsString()
  referred_by_id?: string | null;
}

export class CreateUserDto extends UserDto {}
