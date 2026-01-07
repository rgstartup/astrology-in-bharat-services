import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly usersService: UsersService) { }

    @Get('experts/stats')
    async getExpertsStats() {
        return this.usersService.getExpertStats();
    }

    @Get('users/stats')
    async getUserStats() {
        return this.usersService.getUserStats();
    }

    @Get('users')
    async getAllUsers(
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.usersService.findAllByRole('client', search, page, limit);
    }

    @Get('experts')
    async getAllExperts(
        @Query('search') search?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.usersService.findAllByRole('expert', search, page, limit);
    }
}
