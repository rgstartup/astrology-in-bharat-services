import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UsersFacade } from '@/modules/users/application/users.facade';

@Injectable()
export class BlockStatusGuard implements CanActivate {
  constructor(private readonly usersFacade: UsersFacade) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only block mutations (POST, PUT, PATCH, DELETE)
    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return true;
    }

    const userPayload = request.user;
    // If the request is not authenticated, let other guards (like JwtGuard) handle it
    if (!userPayload || !userPayload.id) {
      return true;
    }

    const user = await this.usersFacade.findById(userPayload.id);
    if (user && user.is_blocked) {
      const body = request.body || {};
      const url = request.url || '';
      
      // Allow going offline even if blocked. 
      // Note: UpdateStatusUseCase handles the check if they try to go online while blocked.
      const isExpertStatusUpdate = url.includes('/expert/status');
      const isMerchantGoingOffline = url.includes('/merchant/profile') && 
        (body.isOnline === false || body.isOnline === 'false' || body.isOnline === 0);

      console.log(`[BlockStatusGuard] User ${user.id} is blocked. URL: ${url}, Body:`, body);
      console.log(`[BlockStatusGuard] isExpertStatusUpdate: ${isExpertStatusUpdate}`);

      if (isExpertStatusUpdate || isMerchantGoingOffline) {
        return true;
      }

      throw new ForbiddenException(
        'Your account has been blocked by the administrator. You cannot perform this action.',
      );
    }

    return true;
  }
}
