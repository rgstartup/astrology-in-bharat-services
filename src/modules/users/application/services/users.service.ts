import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { QueryRunner, MoreThanOrEqual } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dtos/user.dto';
import { RolesService } from '@/modules/role';
import { ProfileClient } from '@/modules/client';
import { ProfileExpert } from '@/modules/expert';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
    private readonly rolesService: RolesService,
  ) { }

  // 🔹 Create new user
  async create(dto: CreateUserDto, queryRunner?: QueryRunner): Promise<User> {
    const repo = this.userRepository.getRepo(queryRunner);
    const user = repo.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      role: dto.role || 'client',
      signinBy: dto.signinBy || 'email&password',
    });

    if (dto.emailVerified) {
      user.emailVerified = dto.emailVerified;
    }

    if (dto.ip_address) {
      user.ip_address = dto.ip_address;
    }

    if (dto.roles?.length) {
      const roleNames = dto.roles.map((r) => r.name);
      const roles = await this.rolesService.findByNames(roleNames);

      if (roles.length !== roleNames.length) {
        const foundNames = roles.map((r) => r.name);
        const missing = roleNames.filter((r) => !foundNames.includes(r));
        throw new NotFoundException(
          `Roles not found: ${missing.join(', ')}. Please ensure database is seeded.`,
        );
      }

      user.roles = roles;

      // 🔹 Infer role if not provided
      if (!dto.role) {
        if (roleNames.includes('expert')) {
          user.role = 'expert';
        } else if (roleNames.includes('admin')) {
          user.role = 'admin';
        } else {
          user.role = 'client';
        }
      }

      // 🔹 Auto-initialize Profile records
      if (roleNames.includes('expert')) {
        user.profile_expert = new ProfileExpert();
      }
      if (roleNames.includes('client')) {
        user.profile_client = new ProfileClient();
        if (dto.phone) {
          user.profile_client.phone = dto.phone;
        }
      }
    }

    return repo.save(user);
  }

  // 🔹 Find all users
  async findAll(
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: User[]; total: number }> {
    return this.userRepository.findAll(search, page, limit);
  }

  // 🔹 Get User Stats
  async getUserStats() {
    const totalUsers = await this.userRepository.count({
      where: { roles: { name: 'client' } },
      relations: ['roles'],
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await this.userRepository.count({
      where: {
        roles: { name: 'client' },
        createdAt: MoreThanOrEqual(sevenDaysAgo),
      },
      relations: ['roles'],
    });

    const blockedUsers = await this.userRepository.count({
      where: {
        roles: { name: 'client' },
        isBlocked: true,
      },
      relations: ['roles'],
    });

    return {
      totalUsers: totalUsers || 0,
      recentUsers: recentUsers || 0,
      blockedUsers: blockedUsers || 0,
    };
  }

  // 🔹 Find user by email
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  // 🔹 Find user with password (for login)
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findByEmailWithPassword(email);
  }

  // 🔹 Get User and Expert Growth Stats
  async getUserExpertGrowthStats(days: number) {
    const stats = await this.userRepository.getUserExpertGrowthStats(days);
    return stats.map((s) => ({
      date: s.date,
      users: parseInt(s.users) || 0,
      astrologers: parseInt(s.astrologers) || 0,
    }));
  }

  // 🔹 Get Expert Stats with Trends
  async getExpertStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.userRepository.getExpertStats(today);

    return {
      totalExperts: parseInt(stats.total) || 0,
      activeExperts: parseInt(stats.active) || 0,
      pendingExperts: parseInt(stats.pending) || 0,
      rejectedExperts: parseInt(stats.rejected) || 0,
      newExpertsToday: parseInt(stats.newtoday) || 0,
      trends: {
        total: { value: '12%', isPositive: true },
        active: { value: '8%', isPositive: true },
        pending: { value: '5%', isPositive: false },
        new: { value: '24%', isPositive: true },
      },
    };
  }

  // 🔹 Find all users by role with pagination
  async findAllByRole(
    roleName: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: User[]; total: number }> {
    return this.userRepository.findAllByRole(roleName, search, page, limit);
  }

  // 🔹 Find by ID
  async findById(id: number): Promise<User> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) throw new NotFoundException('User not found');
    return existingUser;
  }

  // 🔹 Update user
  async update(id: number, dto: Partial<CreateUserDto>): Promise<User> {
    await this.userRepository.update(id, dto as any);
    return this.findById(id);
  }

  // 🔹 Remove user
  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  // 🔹 Assign role
  async assignRole(userId: number, roleName: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const role = await this.rolesService.findByName(roleName);
    if (!role) return null;

    const existingRoleNames = user.roles?.map((r) => r.name) || [];
    if (existingRoleNames.includes(roleName)) return user;

    user.roles = [...(user.roles || []), role];

    // 🔹 Initialize profiles if needed
    if (roleName === 'expert' && !user.profile_expert) {
      user.profile_expert = new ProfileExpert();
    }
    if (roleName === 'client' && !user.profile_client) {
      user.profile_client = new ProfileClient();
    }

    return this.userRepository.save(user);
  }
}
