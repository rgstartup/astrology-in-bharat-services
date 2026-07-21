// src/modules/admin/api/dto/update-sub-admin.dto.ts
import {
  IsArray,
  IsOptional,
  IsEnum,
  IsString,
  MinLength,
} from 'class-validator';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';

export class UpdateSubAdminDto {
  @IsOptional()
  @IsArray()
  @IsEnum(AdminPermission, { each: true, message: 'Invalid permission value' })
  permissions?: AdminPermission[];

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
