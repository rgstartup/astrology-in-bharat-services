// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!requiredRoles) return true; // no roles required

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user?.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('No roles assigned');
    }

    const hasRole = user.roles.some((role: string) =>
      requiredRoles.includes(role),
    );
    if (!hasRole) throw new ForbiddenException('Insufficient role');

    return true;
  }
}
