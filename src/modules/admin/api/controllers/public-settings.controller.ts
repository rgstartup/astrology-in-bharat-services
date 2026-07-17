import { Controller, Get } from '@nestjs/common';
import { GetSupportSettingsUseCase } from '../../application/use-cases/get-support-settings.usecase';
import { GetSystemSettingsUseCase } from '../../application/use-cases/get-system-settings.use-case';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
  path: 'settings',
  version: '1',
})
export class PublicSettingsController {
  constructor(
    private readonly getSupportSettings: GetSupportSettingsUseCase,
    private readonly getSystemSettings: GetSystemSettingsUseCase,
  ) {}

  @Public()
  @Get('support')
  async getSupport() {
    return this.getSupportSettings.execute();
  }

  @Public()
  @Get('platform-fee')
  async getPlatformFee() {
    const fee = await this.getSystemSettings.getOne('PLATFORM_FEE', '50');
    return { platform_fee: Number(fee) };
  }
}
