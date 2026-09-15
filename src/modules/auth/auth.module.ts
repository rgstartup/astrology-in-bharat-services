import { Module } from '@nestjs/common';
import { MerchantAuthController } from './controllers/merchant-auth.controller';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileModule as ExpertProfileModule } from '@/modules/expert/profile/profile.module';
import { Session } from './entities/session.entity';
import { OAuthAccount } from './entities/oauth-accounts.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from '@/core/database/database.module';
import { User } from '@/modules/users/entities/user.entity';
import { SystemSetting } from '@/modules/admin/entities/system-setting.entity';
import { ProfileAgent } from '../agent/entities/profile-agent.entity';
import { MerchantAccountModule } from '@/modules/merchant/account/account.module';
import { QueueModule } from '@/core/queue/queue.module';

import { UsedTokens } from './entities/used-tokens.entity';
import { Otp } from './entities/otp.entity';
import { AuthFacade } from './auth.facade';
import { LoginWithEmailUseCase } from './use-cases/login-with-email.usecase';
import { RegisterUserUseCase } from './use-cases/register-user.usecase';
import { AgentRegisterUserUseCase } from './use-cases/agent-register-user.usecase';
import { MerchantRegisterUserUseCase } from './use-cases/merchant-register-user.usecase';
import { Argon2PasswordHasher } from './hashing/argon2-password.hasher';
import { IssueAuthTokensUseCase } from './use-cases/issue-auth-tokens.usecase';
import { TokenCryptoService } from './tokens/token-crypto.service';
import { SessionRepository } from './repositories/session.repository';
import { UserRegisteredHandler } from './event-handlers/user-registered.handler';
import { LoginWithGoogleUseCase } from './use-cases/login-with-google.usecase';
import { OAuthService } from './services/oauth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth-v2.guard';
import { LogoutUserUseCase } from './use-cases/logout-user.usecase';
import { VerifyEmailUseCase } from './use-cases/verify-email.usecase';
import { UsedTokensService } from './services/used-tokens.service';
import { ResendVerificationEmailUseCase } from './use-cases/resend-verification-email.usecase';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.usecase';
import { ResetPasswordEventHandler } from './event-handlers/reset-password.handler';
import { VerifyEmailHandler } from './event-handlers/verify-email.handler';
import { ResetPasswordUseCase } from './use-cases/reset-password.usecase';
import { RefreshTokenUseCase } from './use-cases/refresh-token.usecase';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { SendMagicLinkEventHandler } from './event-handlers/send-magic-link.handler';
import { SendMagicLinkUseCase } from './use-cases/send-magic-link.usecase';
import { LoginWithMagicLinkUseCase } from './use-cases/login-with-magic-link.usecase';
import { GetMerchantProfileUseCase } from './use-cases/get-merchant-profile.usecase';
import { InitiateEmailRegistrationUseCase } from './use-cases/initiate-email-registration.usecase';
import { CompleteEmailRegistrationUseCase } from './use-cases/complete-email-registration.usecase';
import { ExternalModule } from '@/external/external.module';
import { AUTH_PROFILE_CREATION_STRATEGIES } from './strategies/create-profile/auth-profile-creation.strategy';
import { ClientAuthProfileCreationStrategy } from './strategies/create-profile/client-auth-profile-creation.strategy';
import { ExpertAuthProfileCreationStrategy } from './strategies/create-profile/expert-auth-profile-creation.strategy';
import { AgentAuthProfileCreationStrategy } from './strategies/create-profile/agent-auth-profile-creation.strategy';
import { MerchantAuthProfileCreationStrategy } from './strategies/create-profile/merchant-auth-profile-creation.strategy';
import { AuthProfileCreationResolver } from './strategies/create-profile/auth-profile-creation.resolver';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { AuthPolicy } from './domain/policies/auth.policy';
import { ClientFindProfileStrategy } from './strategies/find-profile/client-find-profile.strategy';
import { ExpertFindProfileStrategy } from './strategies/find-profile/expert-find-profile.strategy';
import { AgentFindProfileStrategy } from './strategies/find-profile/agent-find-profile.strategy';
import { MerchantFindProfileStrategy } from './strategies/find-profile/merchant-find-profile.strategy';
import { FindProfileResolver } from './strategies/find-profile/find-profile.resolver';
import { FIND_PROFILE_STRATEGIES } from './strategies/find-profile/find-profile.strategy';
import { MerchantAccount } from '@/modules/merchant/account/entities/account.entity';
import { ProfileExpert } from '@/modules/expert/profile/entities/profile-expert.entity';
import { ClientAccount } from '@/modules/client/account/entities/account.entity';
import { AuthTokenService } from './services/auth-token.service';

const useCases = [
  RegisterUserUseCase,
  AgentRegisterUserUseCase,
  MerchantRegisterUserUseCase,
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
  GetMerchantProfileUseCase,
  InitiateEmailRegistrationUseCase,
  CompleteEmailRegistrationUseCase,
];

const handlers = [
  UserRegisteredHandler,
  ResetPasswordEventHandler,
  VerifyEmailHandler,
  SendMagicLinkEventHandler,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Session,
      OAuthAccount,
      UsedTokens,
      ProfileAgent,
      ClientAccount,
      ProfileExpert,
      MerchantAccount,
      User,
      SystemSetting,
      Otp,
    ]),
    DatabaseModule,
    ExternalModule,
    ExpertProfileModule,
    MerchantAccountModule,
    QueueModule,
  ],
  providers: [
    OAuthService,
    UsedTokensService,
    JwtStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
    GoogleAuthGuard,
    ClientAuthProfileCreationStrategy,
    ExpertAuthProfileCreationStrategy,
    AgentAuthProfileCreationStrategy,
    MerchantAuthProfileCreationStrategy,
    AuthProfileCreationResolver,
    ClientFindProfileStrategy,
    ExpertFindProfileStrategy,
    AgentFindProfileStrategy,
    MerchantFindProfileStrategy,
    FindProfileResolver,
    {
      provide: AUTH_PROFILE_CREATION_STRATEGIES,
      useFactory: (
        expert: ExpertAuthProfileCreationStrategy,
        client: ClientAuthProfileCreationStrategy,
        agent: AgentAuthProfileCreationStrategy,
        merchant: MerchantAuthProfileCreationStrategy,
      ) => [expert, client, agent, merchant],
      inject: [
        ExpertAuthProfileCreationStrategy,
        ClientAuthProfileCreationStrategy,
        AgentAuthProfileCreationStrategy,
        MerchantAuthProfileCreationStrategy,
      ],
    },
    {
      provide: FIND_PROFILE_STRATEGIES,
      useFactory: (
        expert: ExpertFindProfileStrategy,
        client: ClientFindProfileStrategy,
        agent: AgentFindProfileStrategy,
        merchant: MerchantFindProfileStrategy,
      ) => [expert, client, agent, merchant],
      inject: [
        ExpertFindProfileStrategy,
        ClientFindProfileStrategy,
        AgentFindProfileStrategy,
        MerchantFindProfileStrategy,
      ],
    },

    AuthFacade,
    ...useCases,
    ...handlers,
    {
      provide: IHasherToken,
      useClass: Argon2PasswordHasher,
    },
    AuthPolicy,
    TokenCryptoService,
    SessionRepository,
    AuthTokenService,
  ],
  controllers: [MerchantAuthController],
})
export class AuthModule {}
