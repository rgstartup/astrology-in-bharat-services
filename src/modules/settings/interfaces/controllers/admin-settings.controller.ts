import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from '../../application/services/settings.service';
import { SupportSettingsDto } from '../../application/dtos/support-settings.dto';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';

@Controller({
    path: 'admin/settings',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminSettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Post('support')
    async updateSupportSettings(@Body() dto: SupportSettingsDto) {
        await this.settingsService.updateSupportSettings(dto);
        return { message: 'Settings synchronized successfully' };
    }
}
