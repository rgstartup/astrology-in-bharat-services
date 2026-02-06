import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@/core/database/database.module';
import { User } from '@/modules/users/domain/entities/user.entity';
import { UsersModule } from '@/modules/users/users.module';
import { AuthService } from './application/services/auth.service';
import { OAuthService } from './application/services/oauth.service';
import { TokenService } from './application/services/token.service';
import { UsedTokensService } from './application/services/used-tokens.service';
import { Credential } from './domain/entities/credential.entity';
import { OAuthAccount } from './domain/entities/oauth-accounts.entity';
import { UsedTokens } from './domain/entities/used-tokens.entity';
import { ICredentialRepository } from './domain/repositories/credential.repository.interface';
import { IOAuthAccountRepository } from './domain/repositories/oauth-account.repository.interface';
import { IUsedTokenRepository } from './domain/repositories/used-token.repository.interface';
import { TypeOrmCredentialRepository } from './infrastructure/persistence/typeorm-credential.repository';
import { TypeOrmOAuthAccountRepository } from './infrastructure/persistence/typeorm-oauth-account.repository';
import { TypeOrmUsedTokenRepository } from './infrastructure/persistence/typeorm-used-token.repository';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { LocalStrategy } from './infrastructure/strategies/local.strategy';
import { AuthController } from './interfaces/controllers/auth.controller';
import { GoogleAuthController } from './interfaces/controllers/google-auth.controller';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([Credential, OAuthAccount, UsedTokens, User]),
    DatabaseModule,
  ],
  providers: [
    AuthService,
    TokenService,
    OAuthService,
    UsedTokensService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    {
      provide: ICredentialRepository,
      useClass: TypeOrmCredentialRepository,
    },
    {
      provide: IOAuthAccountRepository,
      useClass: TypeOrmOAuthAccountRepository,
    },
    {
      provide: IUsedTokenRepository,
      useClass: TypeOrmUsedTokenRepository,
    },
  ],
  controllers: [AuthController, GoogleAuthController],
  exports: [TokenService, OAuthService, AuthService],
})
export class AuthModule { }

