import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class ClientGoogleAuthGuard extends AuthGuard('client-google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    // When Google calls the callback with a code, do NOT set new state or override options!
    if (request.query?.code) {
      return {};
    }

    const redirect_uri = (request.query?.redirect_uri as string) || '';

    return {
      scope: ['email', 'profile'],
      state: encodeURIComponent(
        JSON.stringify({
          redirect_uri,
        }),
      ),
    };
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Google authentication failed');
    }
    return user;
  }
}