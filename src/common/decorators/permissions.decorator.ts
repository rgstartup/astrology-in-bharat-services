// src/common/decorators/permissions.decorator.ts
// Usage: @RequirePermissions(AdminPermission.USER_MANAGEMENT)
// Ye decorator ek controller method par lagao to specify karo ki kaunsi permission chahiye.

import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';

export const PERMISSIONS_KEY = Symbol('handler-permissions');

export const RequirePermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
