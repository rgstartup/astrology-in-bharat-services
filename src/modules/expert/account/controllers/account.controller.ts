import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { ExpertAccountFacade } from '../account.facade';
import { UpdateExpertAccountDto } from '../dto/account.dto';

@Controller({ path: 'expert/account', version: '1' })
@UseGuards(ExpertJwtAuthGuard)
export class ExpertAccountController {
  constructor(private readonly accountFacade: ExpertAccountFacade) {}

  @Get()
  getAccount(@CurrentUser() user: IUser) {
    return this.accountFacade.getAccount(user);
  }

  @Patch()
  updateAccount(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(user, dto);
  }
}
