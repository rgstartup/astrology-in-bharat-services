import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    getAuthenticateOptions(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const role = request.query.role || 'client';
        const redirect_uri = request.query.redirect_uri || '';

        return {
            state: JSON.stringify({ role, redirect_uri }),
        };
    }
}
