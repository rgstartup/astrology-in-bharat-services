// src/common/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Role } from 'src/roles/entities/roles.entity';

interface IPayload {
  sub: number;
  roles: Role[];
  iat: number;
  exp: number;
}

export interface IUser extends Omit<IPayload, 'sub'> {
  id: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = this.jwtService.verify<IPayload>(token);
      req.user = {
        ...payload,
        id: payload.sub,
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
