import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { PlatformEnum } from '@/modules/users/infrastructure/enums/Platform.enum';

export class AdminSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@astrologyinbharat.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    const existingAdmin = await userRepository.findOne({
      where: {
        email: adminEmail,
        platform: PlatformEnum.ADMIN,
      },
    });

    if (existingAdmin) {
      console.log(`[AdminSeeder] Super Admin (${adminEmail}) already exists. Skipping.`);
      return;
    }

    const hashedPassword = await argon2.hash(adminPassword, { type: argon2.argon2id });

    const admin = userRepository.create({
      email: adminEmail,
      password: hashedPassword,
      first_name: 'Super',
      last_name: 'Admin',
      name: 'Super Admin',
      full_name: 'Super Admin',
      role: RoleEnum.SUPER_ADMIN,
      platform: PlatformEnum.ADMIN,
      admin_permissions: null,
      email_verified_at: new Date(),
      is_blocked: false,
    });

    await userRepository.save(admin);
    console.log(`[AdminSeeder] Successfully seeded Super Admin user: ${adminEmail}`);
  }
}
