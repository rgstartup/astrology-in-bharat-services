import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BankAccountsFacade } from '../../application/bank-accounts.facade';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../dto/bank-account.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentProfile } from '@/common/decorators/current-profile.decorator';

@Controller({
  path: 'expert/bank-accounts',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('EXPERT')
export class BankAccountsController {
  constructor(private readonly bankAccountsFacade: BankAccountsFacade) {}

  @Post()
  create(
    @CurrentProfile() expertProfileId: string,
    @Body() createBankAccountDto: CreateBankAccountDto,
  ) {
    return this.bankAccountsFacade.create(
      expertProfileId,
      createBankAccountDto,
    );
  }

  @Get()
  findAll(@CurrentProfile() expertProfileId: string) {
    return this.bankAccountsFacade.findAll(expertProfileId);
  }

  @Get(':id')
  findOne(
    @CurrentProfile() expertProfileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bankAccountsFacade.findOne(expertProfileId, id);
  }

  @Patch(':id')
  async update(
    @CurrentProfile() expertProfileId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.bankAccountsFacade.update(
      expertProfileId,
      id,
      updateBankAccountDto,
    );
    return { success: true };
  }

  @Patch(':id/set-primary')
  async setPrimary(
    @CurrentProfile() expertProfileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.bankAccountsFacade.setPrimary(expertProfileId, id);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentProfile() expertProfileId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.bankAccountsFacade.remove(expertProfileId, id);
    return { success: true };
  }
}
