// src/modules/admin/api/dto/create-sub-admin.dto.ts
import {
  IsString,
  IsEmail,
  MinLength,
  IsArray,
  ArrayMinSize,
  IsEnum,
} from 'class-validator';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';

export class CreateSubAdminDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Kam se kam ek page ka access dena zaroori hai' })
  @IsEnum(AdminPermission, { each: true, message: 'Invalid permission value' })
  permissions!: AdminPermission[];
}
