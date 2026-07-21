// src/common/guards/admin-permission.guard.ts
// Ye guard ensure karta hai ki:
// 1. SUPER_ADMIN aur ADMIN ko koi restriction nahi (full access)
// 2. SUB_ADMIN ko sirf wahi API access milega jiska unke paas permission hai
// Usage: @UseGuards(JwtAuthGuard, AdminPermissionGuard) + @RequirePermissions(AdminPermission.USER_MANAGEMENT)

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '@/common/decorators/permissions.decorator';
import { AdminPermission } from '@/modules/users/infrastructure/enums/AdminPermission.enum';
import {
  hasRoles,
  RoleEnum,
} from '@/modules/users/infrastructure/enums/Role.enum';

interface JwtUser {
  id: string;
  roles: RoleEnum[];
  admin_permissions?: AdminPermission[] | null;
}

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Is route ke liye kaunsi permissions chahiye?
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Agar koi permission required nahi hai, allow karo
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtUser }>();

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const userRoles = user.roles || [];

    // SUPER_ADMIN aur ADMIN — inhe koi restriction nahi, full access hai
    if (
      hasRoles(userRoles, 'SUPER_ADMIN') ||
      hasRoles(userRoles, 'ADMIN')
    ) {
      return true;
    }

    // SUB_ADMIN ke liye: unki permissions list check karo
    if (hasRoles(userRoles, 'SUB_ADMIN')) {
      const userPermissions = user.admin_permissions || [];

      const hasPermission = requiredPermissions.every((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
        );
      }

      return true;
    }

    // Koi bhi admin role nahi — block karo
    throw new ForbiddenException('Admin access required');
  }
}
