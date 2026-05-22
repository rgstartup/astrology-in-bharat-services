import { ParseUUIDPipe, 
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseEnumPipe,
 } from '@nestjs/common';
import { CreateUserDto } from '../dto/user.dto';
import { UsersFacade } from '../../application/users.facade';
import { JwtAuthGuard } from '../../../auth/api/guards/auth.guard';
import { RolesGuard } from '../../../auth/api/guards/role.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { User } from '../../infrastructure/entities/user.entity';
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
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Get(':id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersFacade.findById(id as any);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: Partial<CreateUserDto>) {
    // TODO: Handle role updates properly or separate them
    return this.usersFacade.update(id as any, updateUserDto as unknown as Partial<User>);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersFacade.delete(id as any);
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async assignRole(@Param('id', ParseUUIDPipe) id: string, @Body('role', RolePipe({optional: true})) role: RoleEnum) {
      return this.usersFacade.assignRole(id as any, role);
  }
}
