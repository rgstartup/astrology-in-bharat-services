import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BankAccountsService } from '../bank-accounts.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../dto/bank-account.dto';
import { ExpertJwtAuthGuard } from '@/internal/domains/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/internal/domains/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/shared/types/access-token.payload';

@Controller({
  path: 'expert/bank-accounts',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  create(
    @CurrentExpert() expert: IExpert,
    @Body() createBankAccountDto: CreateBankAccountDto,
  ) {
    return this.bankAccountsService.create(expert.sub, createBankAccountDto);
  }

  @Get()
  findAll(@CurrentExpert() expert: IExpert) {
    return this.bankAccountsService.findAll(expert.sub);
  }

  @Get(':id')
  findOne(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankAccountsService.findOne(expert.sub, id);
  }

  @Patch(':id')
  async update(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    await this.bankAccountsService.update(expert.sub, id, updateBankAccountDto);
    return { success: true };
  }

  @Patch(':id/set-primary')
  async setPrimary(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.bankAccountsService.setPrimary(expert.sub, id);
    return { success: true };
  }

  @Delete(':id')
  async remove(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.bankAccountsService.remove(expert.sub, id);
    return { success: true };
  }
}
