import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { GetSupportSettingsUseCase } from '../../application/use-cases/get-support-settings.usecase';

@Controller('settings')
export class SettingsController {
  constructor(private readonly getSupportSettings: GetSupportSettingsUseCase) {}

  @Get('support')
  @HttpCode(HttpStatus.OK)
  async getSupport() {
    return this.getSupportSettings.execute();
  }
}
