import { Controller, Get } from '@nestjs/common';
import { GetSupportSettingsUseCase } from '../../application/use-cases/get-support-settings.usecase';
import { Public } from '@/common/decorators/public.decorator';

@Controller({
  path: 'settings',
  version: '1',
})
export class PublicSettingsController {
  constructor(private readonly getSupportSettings: GetSupportSettingsUseCase) {}

  @Public()
  @Get('support')
  async getSupport() {
    return this.getSupportSettings.execute();
  }
}
