import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminAuthGuard extends AuthGuard('admin-jwt') {
    handleRequest(err: any, user: any) {
        if (err || !user) {
            throw err || new UnauthorizedException('Admin session expired. Please login again.');
        }
        return user;
    }
}
