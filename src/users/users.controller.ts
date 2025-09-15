import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, Session, UserSession } from '@thallesp/nestjs-better-auth';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  @Get('me')
  getSession(@Session() session: UserSession) {
    return session;
  }
}
