import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC } from '../decorators/public.decorator';

export interface IPayload {
  sub: number;
  roles: string[];
  iat: number;
  exp: number;
}

export interface IUser extends Omit<IPayload, 'sub'> {
  id: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();

    // Read tokens (header + cookies)
    const bearerHeader = req.headers.authorization;
    const cookieToken = req.cookies?.accessToken;

    let token: string | undefined;

    // CASE 1 — Authorization header
    if (bearerHeader && bearerHeader.startsWith('Bearer ')) {
      token = bearerHeader.split(' ')[1];
    }

    // CASE 2 — Cookie-based token
    if (!token && cookieToken) {
      token = cookieToken;
    }

    // If no token found anywhere
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      // Verify token
      const payload = this.jwtService.verify<IPayload>(token);

      // Attach decoded user to request object
      req.user = {
        ...payload,
        id: payload.sub,
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
