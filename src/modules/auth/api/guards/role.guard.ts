import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';
import {
  hasRoles,
  Role,
  RoleEnum,
} from '@/modules/users/infrastructure/enums/Role.enum';

interface JwtUser {
  id: string;
  roles: RoleEnum[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    const userRoles = user.roles || [];

    // SUPER_ADMIN ko full bypass
    const isSuperAdmin = hasRoles(userRoles, 'SUPER_ADMIN');
    
    // Agar route 'ADMIN' maangta hai, to 'ADMIN' aur 'SUB_ADMIN' dono pass ho sakte hain
    // Lekin unki specific permission AdminPermissionGuard check karega
    const requiresAdmin = requiredRoles.includes('ADMIN' as Role);
    const isUserAdmin = hasRoles(userRoles, 'ADMIN');
    const isSubAdminActingAsAdmin = requiresAdmin && hasRoles(userRoles, 'SUB_ADMIN');

    const canPass = isSuperAdmin || isUserAdmin || isSubAdminActingAsAdmin || hasRoles(userRoles, ...requiredRoles);

    console.log('[RolesGuard] Decision:', {
      userId: user.id,
      userRoles,
      requiredRoles,
      hasRole: canPass,
      isUserAdmin,
    });

    if (!canPass) {
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
