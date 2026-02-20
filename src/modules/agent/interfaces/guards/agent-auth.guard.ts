import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AgentAuthGuard extends AuthGuard('agent-jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info && info.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          'Agent session expired. Please login again.',
        );
      }
      throw err || new UnauthorizedException('Please login as agent to access this resource.');
    }
    return user;
  }
}
