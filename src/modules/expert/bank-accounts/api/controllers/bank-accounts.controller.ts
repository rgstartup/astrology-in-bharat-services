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
import { BankAccountsFacade } from '../../application/bank-accounts.facade';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from '../dto/bank-account.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

@Controller({
  path: 'expert/bank-accounts',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class BankAccountsController {
  constructor(private readonly bankAccountsFacade: BankAccountsFacade) { }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createBankAccountDto: CreateBankAccountDto,
  ) {
    return this.bankAccountsFacade.create(user.id, createBankAccountDto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.bankAccountsFacade.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.bankAccountsFacade.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBankAccountDto: UpdateBankAccountDto,
  ) {
    return this.bankAccountsFacade.update(user.id, id, updateBankAccountDto);
  }

  @Patch(':id/set-primary')
  setPrimary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.bankAccountsFacade.setPrimary(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.bankAccountsFacade.remove(user.id, id);
  }
}
