import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { DatabaseModule } from '../../../../core/database/database.module';
import { ExternalModule } from '../../../../external/external.module';
import { QueueModule } from '../../../../core/queue/queue.module';
import { JwtModule } from '../../../../core/jwt/jwt.module';
import { IHasherToken } from '../../../../shared/contracts/hasher.contract';
import { Argon2PasswordHasher } from '../../../auth/hashing/argon2-password.hasher';
import { ClientAuthController } from './controllers/auth.controller';
import { ClientAuthService } from './auth.service';
import { InitiateClientEmailRegistrationUseCase } from './use-cases/initiate-client-email-registration.usecase';
import { CompleteClientEmailRegistrationUseCase } from './use-cases/complete-client-email-registration.usecase';
import { ClientLoginWithEmailUseCase } from './use-cases/client-login-with-email.usecase';
import { ClientLoginWithGoogleUseCase } from './use-cases/client-login-with-google.usecase';
import { ClientRefreshTokenUseCase } from './use-cases/client-refresh-token.usecase';
import { ClientLogoutUseCase } from './use-cases/client-logout.usecase';
import { TokenCryptoService } from './services/token-crypto.service';
import { RefreshTokenCacheService } from '@/internal/auth/services/refresh-token-cache.service';
import { ClientRegisteredHandler } from './services/client-registered.handler';
import { ClientJwtStrategy } from './strategies/jwt.strategy';
import { ClientGoogleStrategy } from './strategies/google-auth.strategy';
import { ClientJwtRefreshStrategy } from './strategies/refresh-jwt.strategy';
import { ClientJwtAuthGuard } from './guards/auth.guard';
import { ClientGoogleAuthGuard } from './guards/google-auth.guard';
import { ClientJwtRefreshAuthGuard } from './guards/refresh-auth.guard';
import { ClientJwtLogoutAuthGuard } from './guards/logout-auth.guard';
import { PromotionsModule } from '@/internal/promotions/promotions.module';
import { ConsultationOrchestratorModule } from '@/internal/consultation/orchestrator/consultation-orchestrator.module';

const useCases = [
  InitiateClientEmailRegistrationUseCase,
  CompleteClientEmailRegistrationUseCase,
  ClientLoginWithEmailUseCase,
  ClientLoginWithGoogleUseCase,
  ClientRefreshTokenUseCase,
  ClientLogoutUseCase,
];

@Module({
  imports: [
    PassportModule,
    DatabaseModule,
    ExternalModule,
    QueueModule,
    JwtModule,
    PromotionsModule,
    ConsultationOrchestratorModule,
  ],
  controllers: [ClientAuthController],
  providers: [
    ClientAuthService,
    ...useCases,
    TokenCryptoService,
    RefreshTokenCacheService,
    ClientRegisteredHandler,
    ClientJwtStrategy,
    ClientGoogleStrategy,
    ClientJwtRefreshStrategy,
    ClientJwtAuthGuard,
    ClientGoogleAuthGuard,
    ClientJwtRefreshAuthGuard,
    ClientJwtLogoutAuthGuard,
    {
      provide: IHasherToken,
      useClass: Argon2PasswordHasher,
    },
  ],
  exports: [
    ClientAuthService,
    ClientJwtAuthGuard,
    ClientGoogleAuthGuard,
    ClientJwtRefreshAuthGuard,
    ClientJwtLogoutAuthGuard,
  ],
})
export class AuthModule {}
