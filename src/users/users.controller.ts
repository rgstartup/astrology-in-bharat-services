import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/role.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller({
  path: 'users',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
    return this.usersService.findAll();
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

  // 🔹 Self-service: get my profile
  @Get('/me')
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findById(user.id);
  }

  // 🔹 Self-service: update my profile
  @Patch('/me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: Partial<CreateUserDto>,
  ): Promise<User> {
    return this.usersService.update(user.id, dto);
  }

  // 🔹 Self-service: delete my account
  @Delete('/me')
  async deleteProfile(@CurrentUser() user: User) {
    return this.usersService.remove(user.id);
  }
}
