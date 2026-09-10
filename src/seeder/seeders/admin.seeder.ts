import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';
import { IHasher, IHasherToken } from '@/common/contracts/hasher.contract';
import { ISeeder } from '../interfaces/seeder.interface';

@Injectable()
export class AdminSeeder implements ISeeder {
  readonly name = 'AdminSeeder';
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(IHasherToken)
    private readonly passwordHasher: IHasher,
  ) {}

  async run(): Promise<void> {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@astrologyinbharat.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    const existingAdmin = await this.userRepository.findOne({
      where: {
        email: adminEmail,
        platform: PlatformEnum.ADMIN,
      },
    });

    if (existingAdmin) {
      this.logger.log(`Super Admin (${adminEmail}) already exists. Skipping.`);
      return;
    }

    const hashedPassword = await this.passwordHasher.hash(adminPassword);

    const admin = this.userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      name: 'Super Admin',
      full_name: 'Super Admin',
      role: RoleEnum.SUPER_ADMIN,
      platform: PlatformEnum.ADMIN,
      admin_permissions: null, // Full access
      email_verified_at: new Date(),
      is_blocked: false,
    });

    await this.userRepository.save(admin);
    this.logger.log(`Successfully seeded Super Admin user: ${adminEmail}`);
  }

  async drop(): Promise<void> {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@astrologyinbharat.com').toLowerCase().trim();
    await this.userRepository.delete({
      email: adminEmail,
      platform: PlatformEnum.ADMIN,
    });
    this.logger.log(`Dropped Super Admin user: ${adminEmail}`);
  }
}
