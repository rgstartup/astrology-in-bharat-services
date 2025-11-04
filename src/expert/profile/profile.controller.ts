import { Controller, Get, Patch, Post, Body } from '@nestjs/common';
import { ProfileService } from './profile.service';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from './dto/profile-expert.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/guards/jwt-auth.guard';

@Controller('expert/profile')
export class ProfileController {
  constructor(private readonly expertProfileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: IUser) {
    return this.expertProfileService.getProfile(user);
  }

  @Post()
  createProfile(
    @CurrentUser() user: IUser,
    @Body() dto: CreateProfileExpertDto,
  ) {
    return this.expertProfileService.createProfile(user, dto);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateProfileExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto);
  }
}
