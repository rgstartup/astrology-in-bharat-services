import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { TokenService } from './services/token.service';
import { OAuthService } from './services/oauth.service';
import { UsersModule } from '@/modules/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from './entities/credential.entity';
import { OAuthAccount } from './entities/oauth-accounts.entity';
import { User } from '@/modules/users/entities/user.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { DatabaseModule } from 'src/core/database/database.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthController } from './google-auth.controller';
import { UsedTokens } from './entities/used-tokens.entity';
import { UsedTokensService } from './services/used-tokens.service';
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
  ],
  controllers: [AuthController, GoogleAuthController],
  exports: [TokenService, OAuthService],
})
export class AuthModule { }
