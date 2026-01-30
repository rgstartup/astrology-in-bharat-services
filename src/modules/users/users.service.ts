import { Injectable, NotFoundException } from '@nestjs/common';
import { MoreThanOrEqual, QueryRunner, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/user.dto';
import { RolesService } from '@/modules/role/roles.service';
import { BaseService } from 'src/common/services/transaction.service';
import { ProfileClient } from '@/modules/client/profile/entities/profile-client.entity';
import { ProfileExpert } from '../expert/profile/entities/profile-expert.entity';

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
          `Roles not found: ${missing.join(
            ', ',
          )}. Please ensure database is seeded.`,
        );
      }

      user.roles = roles;

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
    const skip = (page - 1) * limit;

    const query = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .leftJoinAndSelect('user.oauthAccounts', 'oauthAccounts')
      .leftJoinAndSelect('user.credentials', 'credentials');

    if (search) {
      query.where(
        '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

    return { data, total };
  }

  // 🔹 Get User Stats
  async getUserStats() {
    const totalUsers = await this.usersRepo.count({
      where: { roles: { name: 'client' } },
      relations: ['roles'],
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await this.usersRepo.count({
      where: {
        roles: { name: 'client' },
        createdAt: MoreThanOrEqual(sevenDaysAgo),
      },
      relations: ['roles'],
    });

    const blockedUsers = await this.usersRepo.count({
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
    return this.usersRepo.findOne({ where: { email }, relations: ['roles'] });
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

  // 🔹 Get Expert Stats with Trends
  async getExpertStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.usersRepo
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .leftJoin('user.profile_expert', 'profile')
      .where('role.name = :roleName', { roleName: 'expert' })
      .select([
        'COUNT(user.id) as total',
        'COUNT(CASE WHEN LOWER(profile.kycStatus) IN (\'approved\', \'active\') THEN 1 END) as active',
        'COUNT(CASE WHEN LOWER(profile.kycStatus) = \'pending\' OR profile.kycStatus IS NULL THEN 1 END) as pending',
        'COUNT(CASE WHEN LOWER(profile.kycStatus) = \'rejected\' THEN 1 END) as rejected',
        'COUNT(CASE WHEN user.createdAt >= :today THEN 1 END) as newtoday',
      ])
      .setParameter('today', today)
      .getRawOne();

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
    const skip = (page - 1) * limit;

    const query = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('roles.name = :roleName', { roleName });

    if (roleName === 'client') {
      query
        .leftJoinAndSelect('user.profile_client', 'profile')
        .leftJoinAndSelect('profile.addresses', 'addresses');
    } else if (roleName === 'expert') {
      query
        .leftJoinAndSelect('user.profile_expert', 'profile')
        .leftJoinAndSelect('profile.addresses', 'addresses');
    }

    if (search) {
      query.andWhere(
        '(LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query.skip(skip).take(limit).getManyAndCount();

    return { data, total };
  }

  // 🔹 Find by ID
  async findById(id: number): Promise<User> {
    const existingUser = await this.usersRepo.findOne({
      where: { id },
      relations: ['roles', 'oauthAccounts', 'credentials', 'profile_expert', 'profile_client'],
    });

    if (!existingUser) throw new NotFoundException('User not found');

    return existingUser;
  }

  // 🔹 Update user
  async update(id: number, dto: Partial<CreateUserDto>): Promise<User> {
    await this.usersRepo.update(id, dto);
    return this.findById(id);
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

    return this.usersRepo.save(user);
  }
}
