import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { User } from '@/modules/users/domain/entities/user.entity';
import { CreateBankAccountDto, UpdateBankAccountDto } from '../../application/dtos/bank-account.dto';
import { BankAccountsService } from '../../application/services/bank-accounts.service';

@Controller({
    path: 'expert/bank-accounts',
    version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class BankAccountsController {
    constructor(private readonly bankAccountsService: BankAccountsService) { }

    @Post()
    create(@CurrentUser() user: User, @Body() createBankAccountDto: CreateBankAccountDto) {
        return this.bankAccountsService.create(user.id, createBankAccountDto);
    }

    @Get()
    findAll(@CurrentUser() user: User) {
        return this.bankAccountsService.findAll(user.id);
    }

    @Get(':id')
    findOne(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
        return this.bankAccountsService.findOne(user.id, id);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: User,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateBankAccountDto: UpdateBankAccountDto,
    ) {
        return this.bankAccountsService.update(user.id, id, updateBankAccountDto);
    }

    @Patch(':id/set-primary')
    setPrimary(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
        return this.bankAccountsService.setPrimary(user.id, id);
    }

    @Delete(':id')
    remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
        return this.bankAccountsService.remove(user.id, id);
    }
}

