import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { UsersService } from '@/modules/users/application/services/users.service';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CreateUserDto } from '../../application/dtos/user.dto';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // 🔹 Self-service: get my profile
  @Get('me')
  async getUser(@CurrentUser() user: User): Promise<User> {
    return user;
  }

  // 🔹 Self-service: update my profile
  @Patch('me')
  async updateUser(
    @CurrentUser() user: User,
    @Body() dto: Partial<CreateUserDto>,
  ): Promise<User> {
    return this.usersService.update(user.id, dto);
  }

  // 🔹 Self-service: delete my account
  @Delete('me')
  async deleteUser(@CurrentUser() user: User) {
    return this.usersService.remove(user.id);
  }

  // 🔹 Admin: create a new user
  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  // 🔹 Admin: get all users
  @Get()
  @Roles('admin')
  async findAll(): Promise<User[]> {
    const result = await this.usersService.findAll();
    return result.data;
  }

  // 🔹 Admin: get user by ID
  @Get(':id')
  @Roles('admin')
  async findOne(
    @Param('id', new ParseIntPipe()) id: number,
  ): Promise<User | null> {
    return this.usersService.findById(id);
  }

  // 🔹 Admin: update user by ID
  @Patch(':id')
  @Roles('admin')
  async update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() dto: Partial<CreateUserDto>,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  // 🔹 Admin: delete user by ID
  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id', new ParseIntPipe()) id: number) {
    return this.usersService.remove(id);
  }
}
