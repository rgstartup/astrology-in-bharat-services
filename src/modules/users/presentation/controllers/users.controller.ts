import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/user.dto';
import { UsersFacade } from '../../application/users.facade';
import { JwtAuthGuard } from '../../../auth/api/guards/auth.guard';
import { RolesGuard } from '../../../auth/api/guards/role.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
// import { UserRole } from '../../../role/enum/role.enum';
import { User } from '../../infrastructure/persistence/entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersFacade: UsersFacade) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersFacade.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.usersFacade.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersFacade.findById(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: Partial<CreateUserDto>) {
    // TODO: Handle role updates properly or separate them
    return this.usersFacade.update(+id, updateUserDto as unknown as Partial<User>);
  }

  @Delete(':id')
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
