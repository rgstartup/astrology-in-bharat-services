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
import { ExpertJwtLogoutAuthGuard } from './guards/logout-auth.guard';
import { ExpertJwtStrategy } from './strategies/jwt.strategy';
import { ExpertJwtRefreshStrategy } from './strategies/refresh-jwt.strategy';
import { ExpertTokenCryptoService } from './services/token-crypto.service';
import { RefreshTokenCacheService } from '@/internal/auth/services/refresh-token-cache.service';
import { ExpertRegisteredHandler } from './services/expert-registered.handler';
import { ExpertGoogleStrategy } from './strategies/google-auth.strategy';
import { ExpertGoogleAuthGuard } from './guards/google-auth.guard';
import { ConsultationOrchestratorModule } from '@/internal/consultation/orchestrator/consultation-orchestrator.module';

// use cases
import { InitiateExpertEmailRegistrationUseCase } from './use-cases/initiate-expert-email-registration.usecase';
import { CompleteExpertEmailRegistrationUseCase } from './use-cases/complete-expert-email-registration.usecase';
import { ExpertLoginWithEmailUseCase } from './use-cases/expert-login-with-email.usecase';
import { ExpertRefreshTokenUseCase } from './use-cases/expert-refresh-token.usecase';
import { ExpertLoginWithGoogleUseCase } from './use-cases/expert-login-with-google.usecase';
import { ExpertLogoutUseCase } from './use-cases/expert-logout.usecase';

const usecases = [
  InitiateExpertEmailRegistrationUseCase,
  CompleteExpertEmailRegistrationUseCase,
  ExpertLoginWithEmailUseCase,
  ExpertRefreshTokenUseCase,
  ExpertLoginWithGoogleUseCase,
  ExpertLogoutUseCase,
];

@Module({
  imports: [
    PassportModule,
    QueueModule,
    JwtModule,
    ConsultationOrchestratorModule,
  ],
  controllers: [ExpertAuthController],
  providers: [
    ...usecases,
    ExpertAuthService,
    ExpertTokenCryptoService,
    RefreshTokenCacheService,
    ExpertRegisteredHandler,
    ExpertJwtStrategy,
    ExpertJwtRefreshStrategy,
    ExpertGoogleStrategy,
    ExpertJwtAuthGuard,
    ExpertJwtRefreshAuthGuard,
    ExpertGoogleAuthGuard,
    ExpertJwtLogoutAuthGuard,
    { provide: IHasherToken, useClass: Argon2PasswordHasher },
  ],
  exports: [
    ExpertAuthService,
    ExpertJwtAuthGuard,
    ExpertJwtRefreshAuthGuard,
    ExpertGoogleAuthGuard,
    ExpertJwtLogoutAuthGuard,
  ],
})
export class ExpertAuthModule {}
