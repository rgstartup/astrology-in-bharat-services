import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from './dto/profile-expert.dto';
import { QueryExpertDto } from './dto/query-expert.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';

@Controller('expert/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly expertProfileService: ProfileService) { }

  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.expertProfileService.getProfile(user);
  }

  @Post()
  createProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateProfileExpertDto,
  ) {
    return this.expertProfileService.createProfile(user, dto);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto);
  }

  @Patch('status')
  updateStatus(
    @CurrentUser() user: User,
    @Body('is_available') is_available: boolean,
  ) {
    return this.expertProfileService.updateStatus(user, is_available);
  }

  @Get('list')
  @Public()
  listExperts(@Query() query: QueryExpertDto) {
    return this.expertProfileService.listExperts(query);
  }

  @Get(':id')
  @Public()
  getExpertById(@Param('id', ParseIntPipe) id: number) {
    return this.expertProfileService.getExpertById(id);
  }
}
