import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { AgentRegisterUserUseCase, AgentRegisterUserDto } from '../../application/use-cases/agent-register-user.usecase';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly agentRegisterUseCase: AgentRegisterUserUseCase) {}

  @Post('agent/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('agent')
  async agentRegister(
    @Body() dto: AgentRegisterUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.agentRegisterUseCase.execute(dto, user.id);
  }
}
