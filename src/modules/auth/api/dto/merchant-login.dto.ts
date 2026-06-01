import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

export class MerchantLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsNotEmpty()
  password!: string;

  // Always enforce MERCHANT role on this login endpoint
  readonly requiredRole: RoleEnum = RoleEnum.MERCHANT;
}
