import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/user.dto';
import { RolesService } from 'src/roles/roles.service';
import { BaseService } from 'src/common/services/transaction.service';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private rolesService: RolesService,
  ) {
    super(usersRepo);
  }

  // 🔹 Create new user
  async create(dto: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const repo = this.getRepo(queryRunner);
    const user = repo.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    if (dto.emailVerified) {
      user.emailVerified = dto.emailVerified;
    }

    if (dto.roles?.length) {
      const roleNames = dto.roles.map((r) => r.name);
      const roles = await this.rolesService.findByNames(roleNames);
      user.roles = roles;
    }

    return repo.save(user);
  }

  // 🔹 Find all users
  async findAll(): Promise<User[]> {
    return this.usersRepo.find({
      relations: ['roles', 'oauthAccounts', 'credentials'],
    });
  }

  // 🔹 Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  // 🔹 Find user with password (for login)
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .leftJoinAndSelect('user.roles', 'roles')
      .getOne();
  }

  // 🔹 Find by ID
  async findById(id: number): Promise<User> {
    const existingUser = await this.usersRepo.findOne({
      where: { id },
      relations: ['roles', 'oauthAccounts', 'credentials'],
    });

    if (!existingUser) throw new NotFoundException('User not found');

    return existingUser;
  }

  // 🔹 Update user
  async update(id: number, dto: Partial<CreateUserDto>): Promise<User> {
    await this.usersRepo.update(id, dto);
    return this.findById(id) as Promise<User>;
  }

  // 🔹 Remove user
  async remove(id: number): Promise<void> {
    await this.usersRepo.delete(id);
  }

  // 🔹 Assign role
  async assignRole(userId: number, roleName: string): Promise<User | null> {
    const user = await this.findById(userId);
    if (!user) return null;

    const role = await this.rolesService.findByName(roleName);
    if (!role) return null;

    user.roles = [...(user.roles || []), role];
    return this.usersRepo.save(user);
  }
}
