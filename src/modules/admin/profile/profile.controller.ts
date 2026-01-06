import { Controller, Get, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import {
    CreateProfileAdminDto,
    UpdateProfileAdminDto,
} from './dto/create-profile-admin.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller('admin/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get('me')
    getProfile(@CurrentUser() user: User) {
        return this.profileService.getProfile(user);
    }

    @Post()
    createProfile(
        @CurrentUser() user: User,
        @Body() dto: CreateProfileAdminDto,
    ) {
        return this.profileService.createProfile(user, dto);
    }

    @Patch('me')
    updateProfile(
        @CurrentUser() user: User,
        @Body() dto: UpdateProfileAdminDto,
    ) {
        return this.profileService.updateProfile(user, dto);
    }
}
