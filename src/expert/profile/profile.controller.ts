import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from './dto/profile-expert.dto';
import { QueryExpertDto } from './dto/query-expert.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { IUser, JwtAuthGuard } from '@/common/guards/jwt-auth.guard';

@Controller('expert/profile')
@UseGuards(JwtAuthGuard)
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

  @Get('list')
  @Public()
  listExperts(@Query() query: QueryExpertDto) {
    return this.expertProfileService.listExperts(query);
  }
}
