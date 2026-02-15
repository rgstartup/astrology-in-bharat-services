import { Module } from '@nestjs/common';
import { AuthController } from './presentation/controllers/auth.controller';
import { UsersModule } from '@/modules/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './infrastructure/persistence/entities/session.entity';
import { OAuthAccount } from './infrastructure/persistence/entities/oauth-accounts.entity';
import { JwtStrategy } from './presentation/strategies/jwt.strategy';
import { DatabaseModule } from 'src/core/database/database.module';

import { UsedTokens } from './infrastructure/persistence/entities/used-tokens.entity';
import { AuthFacade } from './application/auth.facade';
import { LoginWithEmailUseCase } from './application/use-cases/login-with-email.usecase';
import { RegisterUserUseCase } from './application/use-cases/register-user.usecase';
import { Argon2PasswordHasher } from './infrastructure/hashing/argon2-password.hasher';
import { IssueAuthTokensUseCase } from './application/use-cases/issue-auth-tokens.usecase';
import { TokenCryptoService } from './infrastructure/tokens/token-crypto.service';
import { SessionRepository } from './infrastructure/persistence/repositories/session.repository';
import { UserRegisteredHandler } from './application/event-handlers/user-registered.handler';
import { LoginWithGoogleUseCase } from './application/use-cases/login-with-google.usecase';
import { OAuthService } from './infrastructure/persistence/services/oauth.service';
import { GoogleStrategy } from './presentation/strategies/google.strategy';
import { GoogleAuthController } from './presentation/controllers/google-auth.controller';
import { LogoutUserUseCase } from './application/use-cases/logout-user.usecase';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.usecase';
import { UsedTokensService } from './infrastructure/persistence/services/used-tokens.service';
import { ResendVerificationEmailUseCase } from './application/use-cases/resend-verification-email.usecase';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.usecase';
import { ResetPasswordEventHandler } from './application/event-handlers/reset-password.handler';
import { VerifyEmailHandler } from './application/event-handlers/verify-email.handler';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.usecase';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token.usecase';
import { JwtRefreshStrategy } from './presentation/strategies/jwt-refresh.strategy';
import { SendMagicLinkEventHandler } from './application/event-handlers/send-magic-link.handler';
import { SendMagicLinkUseCase } from './application/use-cases/send-magic-link.usecase';
import { LoginWithMagicLinkUseCase } from './application/use-cases/login-with-magic-link.usecase';
import { ExternalModule } from '@/external/external.module';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Session, OAuthAccount, UsedTokens]),
    DatabaseModule,
    ExternalModule,
  ],
  providers: [
    // AuthService,
    // TokenService,
    OAuthService,
    UsedTokensService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,

    AuthFacade,
    // Use case -  start
    RegisterUserUseCase,
    LoginWithEmailUseCase,
    LoginWithGoogleUseCase,
    IssueAuthTokensUseCase,
    LogoutUserUseCase,
    VerifyEmailUseCase,
    ResendVerificationEmailUseCase,
    ForgotPasswordUseCase,
    ResetPasswordUseCase,
    RefreshTokenUseCase,
    SendMagicLinkUseCase,
    LoginWithMagicLinkUseCase,
    // Use case - end

    Argon2PasswordHasher,
    TokenCryptoService,
    SessionRepository,
    UserRegisteredHandler,
    ResetPasswordEventHandler,
    VerifyEmailHandler,
    SendMagicLinkEventHandler,
  ],
  controllers: [AuthController, GoogleAuthController],
  // exports: [TokenService, OAuthService],
})
export class AuthModule {}
