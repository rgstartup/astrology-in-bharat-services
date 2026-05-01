import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { GetSupportSettingsUseCase } from '../../application/use-cases/get-support-settings.usecase';
import { GetSystemSettingsUseCase } from '../../application/use-cases/get-system-settings.use-case';
import { UpdateSystemSettingUseCase } from '../../application/use-cases/update-system-setting.use-case';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SettingsController {
  constructor(
    private readonly getSupportSettings: GetSupportSettingsUseCase,
    private readonly getSystemSettings: GetSystemSettingsUseCase,
    private readonly updateSystemSetting: UpdateSystemSettingUseCase,
  ) { }

  @Get('support')
  @HttpCode(HttpStatus.OK)
  async getSupport() {
    return this.getSupportSettings.execute();
  }

  @Get('system')
  @HttpCode(HttpStatus.OK)
  async getSystem() {
    return this.getSystemSettings.execute();
  }

  @Post('system')
  @HttpCode(HttpStatus.OK)
  async updateSystem(@Body() body: { key: string; value: string; description?: string }) {
    return this.updateSystemSetting.execute(body.key, body.value, body.description);
  }

  @Get('commissions')
  @HttpCode(HttpStatus.OK)
  async getCommissions() {
    const keys = ['COMMISION_FROM_ASTROLOGER', 'COMMISION_FROM_CLIENT', 'COMMISION_FROM_PUJA_SHOP', 'GST_PERCENTAGE', 'COMMISION_FOR_BUYER_AGENT'];
    const settings = await this.getSystemSettings.execute(keys);

    // Ensure all keys are present in the response
    const result: Record<string, string> = {};
    keys.forEach(key => {
      const found = settings.find(s => s.key === key);
      if (found) {
        result[key] = found.value;
      } else {
        // Defaults based on key
        if (key === 'GST_PERCENTAGE') result[key] = '18';
        else result[key] = '3';
      }
    });
    return result;
  }

  @Post('commissions')
  @HttpCode(HttpStatus.OK)
  async updateCommissions(@Body() body: Record<string, string>) {
    const promises = Object.entries(body).map(([key, value]) =>
      this.updateSystemSetting.execute(key, value.toString())
    );
    await Promise.all(promises);
    return { success: true };
  }

  @Post('support')
  @HttpCode(HttpStatus.OK)
  async updateSupport(@Body() body: { email: string; phone: string; whatsapp: string }) {
    const promises = [
      this.updateSystemSetting.execute('support_email', body.email),
      this.updateSystemSetting.execute('support_phone', body.phone),
      this.updateSystemSetting.execute('support_whatsapp', body.whatsapp),
    ];
    await Promise.all(promises);
    return { success: true };
  }
}
