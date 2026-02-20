import { IsEmail, IsString, IsOptional, MinLength, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
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
  signinBy?: 'email&password' | 'google' | 'agent_registered';

  @IsOptional()
  @ValidateNested({ each: true }) // validate each role object
  @Type(() => RolesDto) // transform plain objects into RolesDto instances
  roles?: RolesDto[]; // role names only, no entity

  @IsOptional()
  @IsString()
  referredByAgentId?: string; // set when agent registers a user
}

export class CreateUserDto extends UserDto { }
export class UpdateUserDto extends UserDto { }
