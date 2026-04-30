import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES, ROLES_KEY } from '@/common/decorators/roles.decorator';

/**
 * JWT payload user shape from JwtStrategy.validate():
 *   { id: number, role: string, roles: { name: string }[] }
 */
interface JwtUser {
  id: number;
  role?: string;
  roles?: { name: string }[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<DEFAULT_ROLES[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // If no roles are required → allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtUser }>();

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    const userRole = user.role?.toLowerCase();
    const userRoles = Array.isArray(user.roles)
      ? user.roles.map((r) => r.name.toLowerCase())
      : [];

    const normalizedRequiredRoles = requiredRoles.map(r => r.toLowerCase());

    const isUserAdmin = userRole === 'admin' || userRoles.includes('admin');

    const hasRole =
      isUserAdmin ||
      (userRole && normalizedRequiredRoles.includes(userRole)) ||
      userRoles.some((roleName) =>
        normalizedRequiredRoles.includes(roleName),
      );

    console.log('[RolesGuard] Decision:', {
      userId: user.id,
      userRole,
      userRoles,
      requiredRoles: normalizedRequiredRoles,
      hasRole,
      isUserAdmin
    });

    if (!hasRole) {
      console.error('[RolesGuard] Access Denied:', {
        userId: user.id,
        userRole,
        userRoles,
        requiredRoles: normalizedRequiredRoles,
      });
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
