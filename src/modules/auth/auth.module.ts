import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './application/services/auth.service';
import { AuthController } from './interfaces/controllers/auth.controller';
import { TokenService } from './application/services/token.service';
import { OAuthService } from './application/services/oauth.service';
import { UsersModule } from '@/modules/users/users.module';
import { Credential } from './domain/entities/credential.entity';
import { OAuthAccount } from './domain/entities/oauth-accounts.entity';
import { User } from '@/modules/users';
import { LocalStrategy } from './infrastructure/strategies/local.strategy';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { DatabaseModule } from 'src/core/database/database.module';
import { GoogleStrategy } from './infrastructure/strategies/google.strategy';
import { GoogleAuthController } from './interfaces/controllers/google-auth.controller';
import { UsedTokens } from './domain/entities/used-tokens.entity';
import { UsedTokensService } from './application/services/used-tokens.service';
import { ICredentialRepository } from './domain/repositories/credential.repository.interface';
import { TypeOrmCredentialRepository } from './infrastructure/persistence/typeorm-credential.repository';
import { IOAuthAccountRepository } from './domain/repositories/oauth-account.repository.interface';
import { TypeOrmOAuthAccountRepository } from './infrastructure/persistence/typeorm-oauth-account.repository';
import { IUsedTokenRepository } from './domain/repositories/used-token.repository.interface';
import { TypeOrmUsedTokenRepository } from './infrastructure/persistence/typeorm-used-token.repository';

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

