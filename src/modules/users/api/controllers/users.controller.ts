import {
  ParseUUIDPipe,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/user.dto';
import { UsersFacade } from '../../application/users.facade';
import { JwtAuthGuard } from '../../../auth/api/guards/auth.guard';
import { RolesGuard } from '../../../auth/api/guards/role.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { User } from '../../infrastructure/entities/user.entity';
import { IUser } from '@/common/types/access-token.payload';
import { RoleEnum, RolePipe } from '../../infrastructure/enums/Role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersFacade: UsersFacade) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersFacade.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll() {
    return this.usersFacade.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: IUser) {
    return user;
  }

  @Get(':id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersFacade.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: Partial<CreateUserDto>,
  ) {
    // TODO: Handle role updates properly or separate them
    const _result = await this.usersFacade.update(
      id,
      updateUserDto as unknown as Partial<User>,
    );
    return { success: true };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const _result = await this.usersFacade.delete(id);
    return { success: true };
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role', RolePipe({ optional: true })) role: RoleEnum,
  ) {
    return this.usersFacade.assignRole(id, role);
  }
}
