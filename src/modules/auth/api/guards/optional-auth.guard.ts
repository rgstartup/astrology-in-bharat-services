import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw an error if user is not found

  handleRequest<T>(err: Error | null, user: T, _info: unknown): T | null {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
