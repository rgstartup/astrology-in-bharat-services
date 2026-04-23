import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { BetterAuthStrategy } from './api/strategies/better-auth.strategy';
import { RolesGuard } from './api/guards/role.guard';
import { JwtAuthGuard } from './api/guards/auth.guard';
import { AuthController } from './api/controllers/auth.controller';
import { AgentRegisterUserUseCase } from './application/use-cases/agent-register-user.usecase';

@Module({
  imports: [UsersModule],
  providers: [BetterAuthStrategy, RolesGuard, JwtAuthGuard, AgentRegisterUserUseCase],
  controllers: [AuthController],
  exports: [BetterAuthStrategy, RolesGuard, JwtAuthGuard],
})
export class AuthModule {}
