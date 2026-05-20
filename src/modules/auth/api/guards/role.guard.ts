import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import { Role, RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { hasRoles } from '@/modules/users/infrastructure/enums/Role.enum';

interface JwtUser {
  id: number;
  roles: RoleEnum[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // If no roles are required → allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtUser }>();

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const isUserAdmin = hasRoles(user.roles, 'ADMIN');

    const hasRole =
      isUserAdmin || hasRoles(user.roles, ...requiredRoles);

    console.log('[RolesGuard] Decision:', {
      userId: user.id,
      userRoles: user.roles,
      requiredRoles,
      hasRole,
      isUserAdmin
    });

    if (!hasRole) {
      console.error('[RolesGuard] Access Denied:', {
        userId: user.id,
        userRoles: user.roles,
        requiredRoles,
      });
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
