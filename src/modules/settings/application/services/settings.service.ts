import { Injectable, Inject } from '@nestjs/common';
import { ISettingRepository } from '../../domain/repositories/setting.repository.interface';
import { SupportSettingsDto } from '../dtos/support-settings.dto';
import { Setting } from '../../domain/entities/setting.entity';

@Injectable()
export class SettingsService {
    constructor(
        @Inject(ISettingRepository)
        private readonly settingRepository: ISettingRepository,
    ) { }

    async getSupportSettings(): Promise<SupportSettingsDto> {
        const keys = ['support_email', 'support_phone', 'support_whatsapp'];
        const settings = await this.settingRepository.findByKeys(keys);

        const result = {
            email: settings.find(s => s.key === 'support_email')?.value || 'support@astrologyinbharat.com',
            phone: settings.find(s => s.key === 'support_phone')?.value || '+91 98765 43210',
            whatsapp: settings.find(s => s.key === 'support_whatsapp')?.value || '+91 98765 43210',
        };

        return result;
    }

    async updateSupportSettings(dto: SupportSettingsDto): Promise<void> {
        const settingsToSave: Setting[] = [
            { key: 'support_email', value: dto.email } as Setting,
            { key: 'support_phone', value: dto.phone } as Setting,
            { key: 'support_whatsapp', value: dto.whatsapp } as Setting,
        ];

        await this.settingRepository.saveMany(settingsToSave);
    }
}
