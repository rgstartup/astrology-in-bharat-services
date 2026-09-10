import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '@/modules/admin/entities/system-setting.entity';
import { ISeeder } from '../interfaces/seeder.interface';

@Injectable()
export class SystemSettingSeeder implements ISeeder {
  readonly name = 'SystemSettingSeeder';
  private readonly logger = new Logger(SystemSettingSeeder.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly systemSettingRepository: Repository<SystemSetting>,
  ) {}

  async run(): Promise<void> {
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
      const existing = await this.systemSettingRepository.findOne({
        where: { key: setting.key },
      });

      if (!existing) {
        const item = this.systemSettingRepository.create(setting);
        await this.systemSettingRepository.save(item);
        createdCount++;
      }
    }

    this.logger.log(
      `SystemSettingSeeder finished. Added ${createdCount} new settings (${defaultSettings.length - createdCount} already existed).`,
    );
  }

  async drop(): Promise<void> {
    const keys = [
      'APP_NAME',
      'SUPPORT_EMAIL',
      'CURRENCY_DEFAULT',
      'MAINTENANCE_MODE',
      'DEFAULT_COMMISSION_PERCENTAGE',
      'FREE_TRIAL_MINUTES',
    ];
    await this.systemSettingRepository
      .createQueryBuilder()
      .delete()
      .where('key IN (:...keys)', { keys })
      .execute();

    this.logger.log('Dropped default system settings.');
  }
}
