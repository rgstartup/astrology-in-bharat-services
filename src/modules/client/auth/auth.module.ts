import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ClientAccount } from '../account/entities/account.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { OAuthAccount } from '@/modules/auth/infrastructure/entities/oauth-accounts.entity';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { Otp } from '@/modules/auth/infrastructure/entities/otp.entity';
import { DatabaseModule } from '@/core/database/database.module';
import { ExternalModule } from '@/external/external.module';
import { QueueModule } from '@/core/queue/queue.module';
import { JwtModule } from '@/core/jwt/jwt.module';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { Argon2PasswordHasher } from '@/modules/auth/infrastructure/hashing/argon2-password.hasher';
import { ClientAuthController } from './controllers/auth.controller';
import { ClientAuthFacade } from './auth.facade';
import { InitiateClientEmailRegistrationUseCase } from './use-cases/initiate-client-email-registration.usecase';
import { CompleteClientEmailRegistrationUseCase } from './use-cases/complete-client-email-registration.usecase';
import { ClientLoginWithEmailUseCase } from './use-cases/client-login-with-email.usecase';
import { ClientLoginWithGoogleUseCase } from './use-cases/client-login-with-google.usecase';
import { ClientRefreshTokenUseCase } from './use-cases/client-refresh-token.usecase';
import { TokenCryptoService } from './services/token-crypto.service';
import { ClientRegisteredHandler } from './services/client-registered.handler';
import { ClientJwtStrategy } from './strategies/jwt.strategy';
import { ClientGoogleStrategy } from './strategies/google-auth.strategy';
import { ClientJwtRefreshStrategy } from './strategies/refresh-jwt.strategy';
import { ClientJwtAuthGuard } from './guards/auth.guard';
import { ClientGoogleAuthGuard } from './guards/google-auth.guard';
import { ClientJwtRefreshAuthGuard } from './guards/refresh-auth.guard';

const useCases = [
  InitiateClientEmailRegistrationUseCase,
  CompleteClientEmailRegistrationUseCase,
  ClientLoginWithEmailUseCase,
  ClientLoginWithGoogleUseCase,
  ClientRefreshTokenUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientAccount, User, OAuthAccount, Session, Otp]),
    PassportModule,
    DatabaseModule,
    ExternalModule,
    QueueModule,
    JwtModule,
  ],
  controllers: [ClientAuthController],
  providers: [
    ClientAuthFacade,
    ...useCases,
    TokenCryptoService,
    ClientRegisteredHandler,
    ClientJwtStrategy,
    ClientGoogleStrategy,
    ClientJwtRefreshStrategy,
    ClientJwtAuthGuard,
    ClientGoogleAuthGuard,
    ClientJwtRefreshAuthGuard,
    {
      provide: IHasherToken,
      useClass: Argon2PasswordHasher,
    },
  ],
  exports: [
    ClientAuthFacade,
    ClientJwtAuthGuard,
    ClientGoogleAuthGuard,
    ClientJwtRefreshAuthGuard,
    TypeOrmModule,
  ],
})
export class AuthModule {}
