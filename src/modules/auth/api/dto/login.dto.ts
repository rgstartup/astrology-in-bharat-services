import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { IsEmail, IsEnum, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsEnum(RoleEnum)
  requiredRole!: RoleEnum;
}
