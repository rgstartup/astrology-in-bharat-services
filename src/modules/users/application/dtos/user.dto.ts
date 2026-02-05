// src/users/dto/create-user.dto.ts
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RolesDto } from '@/modules/role/application/dtos/roles.dto';

class UserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  ip_address?: string;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsString()
  role?: 'client' | 'expert' | 'admin';

  @IsOptional()
  @IsString()
  signinBy?: 'email&password' | 'google';

  @IsOptional()
  @ValidateNested({ each: true }) // validate each role object
  @Type(() => RolesDto) // transform plain objects into RolesDto instances
  roles?: RolesDto[]; // role names only, no entity
}

export class CreateUserDto extends UserDto { }
