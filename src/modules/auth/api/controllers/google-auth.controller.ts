import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { GoogleAuthGuard } from '../guards/google-auth.guard';

@Controller({
  path: 'auth/google',
  version: '1',
})
export class GoogleAuthController {
  @Get('login')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {
    return;
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request) {
    return req.user;
  }
}
