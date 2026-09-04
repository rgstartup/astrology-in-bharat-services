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
import { BankAccountsFacade } from '../bank-accounts.facade';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../dto/bank-account.dto';
import { ExpertJwtAuthGuard } from '@/modules/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';

@Controller({
  path: 'expert/bank-accounts',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsFacade: BankAccountsFacade) {}

  @Post()
  create(
    @CurrentExpert() expert: IExpert,
    @Body() createBankAccountDto: CreateBankAccountDto,
  ) {
    return this.bankAccountsFacade.create(expert.sub, createBankAccountDto);
  }

  @Get()
  findAll(@CurrentExpert() expert: IExpert) {
    return this.bankAccountsFacade.findAll(expert.sub);
  }

  @Get(':id')
  findOne(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.bankAccountsFacade.findOne(expert.sub, id);
  }

  @Patch(':id')
  async update(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.bankAccountsFacade.update(expert.sub, id, updateBankAccountDto);
    return { success: true };
  }

  @Patch(':id/set-primary')
  async setPrimary(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.bankAccountsFacade.setPrimary(expert.sub, id);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.bankAccountsFacade.remove(expert.sub, id);
    return { success: true };
  }
}
