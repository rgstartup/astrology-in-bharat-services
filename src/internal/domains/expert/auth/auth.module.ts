import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { QueueModule } from '@/core/queue/queue.module';
import { JwtModule } from '@/core/jwt/jwt.module';
import { IHasherToken } from '@/shared/contracts/hasher.contract';
import { Argon2PasswordHasher } from '@/internal/auth/hashing/argon2-password.hasher';
import { ExpertAuthController } from './controllers/auth.controller';
import { ExpertAuthService } from './auth.service';
import { ExpertJwtAuthGuard } from './guards/auth.guard';
import { ExpertJwtRefreshAuthGuard } from './guards/refresh-auth.guard';
import { ExpertJwtStrategy } from './strategies/jwt.strategy';
import { ExpertJwtRefreshStrategy } from './strategies/refresh-jwt.strategy';
import { ExpertTokenCryptoService } from './services/token-crypto.service';
import { ExpertRegisteredHandler } from './services/expert-registered.handler';
import { InitiateExpertEmailRegistrationUseCase } from './use-cases/initiate-expert-email-registration.usecase';
import { CompleteExpertEmailRegistrationUseCase } from './use-cases/complete-expert-email-registration.usecase';
import { ExpertLoginWithEmailUseCase } from './use-cases/expert-login-with-email.usecase';
import { ExpertRefreshTokenUseCase } from './use-cases/expert-refresh-token.usecase';

@Module({
  imports: [PassportModule, QueueModule, JwtModule],
  controllers: [ExpertAuthController],
  providers: [
    ExpertAuthService,
    InitiateExpertEmailRegistrationUseCase,
    CompleteExpertEmailRegistrationUseCase,
    ExpertLoginWithEmailUseCase,
    ExpertRefreshTokenUseCase,
    ExpertTokenCryptoService,
    ExpertRegisteredHandler,
    ExpertJwtStrategy,
    ExpertJwtRefreshStrategy,
    ExpertJwtAuthGuard,
    ExpertJwtRefreshAuthGuard,
    { provide: IHasherToken, useClass: Argon2PasswordHasher },
  ],
  exports: [ExpertAuthService, ExpertJwtAuthGuard, ExpertJwtRefreshAuthGuard],
})
export class ExpertAuthModule {}
