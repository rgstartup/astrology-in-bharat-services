import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { UsersFacade } from '../../application/users.facade';
import { JwtAuthGuard } from '../../../auth/api/guards/auth.guard';
import { RolesGuard } from '../../../auth/api/guards/role.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { BetterAuthUser } from '@/common/types/better-auth-user.type';

@Controller('users')
export class UsersController {
  constructor(private readonly usersFacade: UsersFacade) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersFacade.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.usersFacade.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: BetterAuthUser) {
    return user;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersFacade.findById(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersFacade.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.usersFacade.delete(+id);
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  assignRole(@Param('id') id: string, @Body('role') role: string) {
    return this.usersFacade.assignRole(+id, role);
  }
}
