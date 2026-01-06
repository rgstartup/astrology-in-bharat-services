import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly usersService: UsersService) { }

    @Get('users')
    async getAllUsers() {
        return this.usersService.findAll();
    }

    @Get('experts')
    async getAllExperts() {
        return this.usersService.findAllByRole('expert');
    }
}
