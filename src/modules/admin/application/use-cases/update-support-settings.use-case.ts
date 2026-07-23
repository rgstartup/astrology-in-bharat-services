import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../infrastructure/entities/system-setting.entity';
import { UpdateSupportSettingsDto } from '../../api/dto/update-support-settings.dto';

@Injectable()
export class UpdateSupportSettingsUseCase {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingRepo: Repository<SystemSetting>,
  ) {}

  private async updateSetting(key: string, value: string) {
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingRepo.create({ key, value });
    }
    await this.settingRepo.save(setting);
  }

  async execute(dto: UpdateSupportSettingsDto) {
    const { email, phone, whatsapp } = dto;
    const promises = [
      this.updateSetting('support_email', email),
      this.updateSetting('support_phone', phone),
      this.updateSetting('support_whatsapp', whatsapp),
    ];
    await Promise.all(promises);
    return { success: true };
  }
}
