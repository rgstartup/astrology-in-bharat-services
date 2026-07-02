import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../infrastructure/entities/system-setting.entity';

@Injectable()
export class GetSupportSettingsUseCase {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  async execute() {
    const keys = ['support_email', 'support_phone', 'support_whatsapp'];
    const _settings = await this.settingRepo.find({
      where: {
        key: Buffer.from(keys.join('|'), 'utf-8').toString(), // This is just for visualization, we'll use In([])
      },
    });

    // Actually use In([]) for clean query
    const results = await this.settingRepo
      .createQueryBuilder('s')
      .where('s.key IN (:...keys)', { keys })
      .getMany();

    const settingsMap = results.reduce(
      (map, item) => {
        map[item.key] = item.value;
        return map;
      },
      {} as Record<string, string>,
    );

    return {
      email: settingsMap['support_email'] || 'support@astrologyinbharat.com',
      phone: settingsMap['support_phone'] || '+91 9999999999',
      whatsapp: settingsMap['support_whatsapp'] || '+91 9999999999',
    };
  }
}
