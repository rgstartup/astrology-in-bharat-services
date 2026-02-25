// src/users/dto/create-user.dto.ts
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RolesDto } from '@/modules/role/dto/roles.dto';

class UserDto {
  @IsEmail()
  email: string;

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
  @ValidateNested({ each: true }) // validate each role object
  @Type(() => RolesDto) // transform plain objects into RolesDto instances
  roles?: RolesDto[]; // role names only, no entity

  @IsString()
  @IsOptional()
  avatar?: string;
}

export class CreateUserDto extends UserDto { }
