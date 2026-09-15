import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import { validateSync } from 'class-validator';
import { GoogleLoginQueryDto } from '../dto/login.dto';

export interface GoogleAuthRequest extends Request {
  googleLoginQuery: GoogleLoginQueryDto;
}

@Injectable()
export class GoogleLoginQueryGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GoogleAuthRequest>();

    const query = plainToInstance(GoogleLoginQueryDto, request.query);

    const errors = validateSync(query);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Invalid Google login parameters',
        errors,
      });
    }

    request.googleLoginQuery = query;

    return true;
  }
}
