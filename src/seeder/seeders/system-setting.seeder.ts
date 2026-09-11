import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { SystemSetting } from '@/modules/admin/entities/system-setting.entity';

export class SystemSettingSeeder implements Seeder {
  async run(dataSource: DataSource): Promise<void> {
    const systemSettingRepository = dataSource.getRepository(SystemSetting);

    const defaultSettings: Array<{ key: string; value: string; description: string }> = [
      {
        key: 'APP_NAME',
        value: 'Astrology In Bharat',
        description: 'Primary application display name',
      },
      {
        key: 'SUPPORT_EMAIL',
        value: 'support@astrologyinbharat.com',
        description: 'Customer and expert support email address',
      },
      {
        key: 'CURRENCY_DEFAULT',
        value: 'INR',
        description: 'Default platform currency code',
      },
      {
        key: 'MAINTENANCE_MODE',
        value: 'false',
        description: 'Toggle platform-wide maintenance mode',
      },
      {
        key: 'DEFAULT_COMMISSION_PERCENTAGE',
        value: '20',
        description: 'Default platform commission cut for consultations',
      },
      {
        key: 'FREE_TRIAL_MINUTES',
        value: '5',
        description: 'Complimentary first call duration in minutes',
      },
    ];

    let createdCount = 0;

    for (const setting of defaultSettings) {
      const existing = await systemSettingRepository.findOne({
        where: { key: setting.key },
      });

      if (!existing) {
        const item = systemSettingRepository.create(setting);
        await systemSettingRepository.save(item);
        createdCount++;
      }
    }

    console.log(
      `[SystemSettingSeeder] Finished. Added ${createdCount} new settings (${defaultSettings.length - createdCount} already existed).`,
    );
  }
}
