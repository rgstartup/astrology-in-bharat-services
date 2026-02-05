import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  DEFAULT_ROLES,
  ROLES_KEY,
} from '@/common/decorators/roles.decorator';
import { User } from '@/modules/users';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<DEFAULT_ROLES>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // If no roles are required → allow access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: User }>();

    if (!user?.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('No roles assigned');
    }

    const hasRole = user.roles.some((role) =>
      requiredRoles.includes(role.name),
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

