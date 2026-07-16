import { Injectable } from '@nestjs/common';
import { UpdateSystemSettingUseCase } from './update-system-setting.use-case';
import { UpdateSupportSettingsDto } from '../../api/dto/update-support-settings.dto';

@Injectable()
export class UpdateSupportSettingsUseCase {
  constructor(
    private readonly updateSystemSetting: UpdateSystemSettingUseCase,
  ) {}

  async execute(dto: UpdateSupportSettingsDto) {
    const { email, phone, whatsapp } = dto;
    const promises = [
      this.updateSystemSetting.execute({ key: 'support_email', value: email }),
      this.updateSystemSetting.execute({ key: 'support_phone', value: phone }),
      this.updateSystemSetting.execute({ key: 'support_whatsapp', value: whatsapp }),
    ];
    await Promise.all(promises);
    return { success: true };
  }
}
