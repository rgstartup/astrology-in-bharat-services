import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES, ROLES_KEY } from '@/common/decorators/roles.decorator';
import { BetterAuthUser } from '@/common/types/better-auth-user.type';

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

    const { user } = context.switchToHttp().getRequest<{
      user?: BetterAuthUser;
    }>();

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    if (!user.role) {
      throw new ForbiddenException('No role assigned');
    }

    const userRole = user.role.toLowerCase();
    const normalizedRequiredRoles = requiredRoles.map((r) => r.toLowerCase());

    const hasRole = normalizedRequiredRoles.includes(userRole);

    console.log('[RolesGuard] Decision:', {
      userId: user.id,
      userRole,
      requiredRoles: normalizedRequiredRoles,
      hasRole,
    });

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
