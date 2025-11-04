import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';

import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/guards/jwt-auth.guard';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from './dto/profile-client.dto';

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  async getProfile(@CurrentUser() user: IUser) {
    return this.service.findByUserId(user.id);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: IUser,
    @Body() dto: CreateProfileClientDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateProfileClientDto,
  ) {
    return this.service.update(user.id, dto);
  }
}
