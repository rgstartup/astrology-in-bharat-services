import { Controller, Get } from '@nestjs/common';
import { SettingsService } from '../../application/services/settings.service';
import { SupportSettingsDto } from '../../application/dtos/support-settings.dto';

@Controller({
    path: 'settings',
    version: '1',
})
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get('support')
    async getSupportSettings(): Promise<SupportSettingsDto> {
        return this.settingsService.getSupportSettings();
    }
}
