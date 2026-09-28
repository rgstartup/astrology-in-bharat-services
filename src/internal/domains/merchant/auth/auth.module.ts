import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { MerchantAccount } from '../account/entities/account.entity';
import { User } from '@/internal/users/entities/user.entity';
import { Session } from '@/internal/auth/entities/session.entity';
import { DatabaseModule } from '@/core/database/database.module';
import { QueueModule } from '@/core/queue/queue.module';
import { JwtModule } from '@/core/jwt/jwt.module';
import { IHasherToken } from '@/shared/contracts/hasher.contract';
import { Argon2PasswordHasher } from '@/internal/auth/hashing/argon2-password.hasher';
import { MerchantAuthController } from './controllers/auth.controller';
import { MerchantAuthService } from './auth.service';
import { MerchantJwtAuthGuard } from './guards/auth.guard';
import { MerchantJwtRefreshAuthGuard } from './guards/refresh-auth.guard';
import { MerchantJwtStrategy } from './strategies/jwt.strategy';
import { MerchantJwtRefreshStrategy } from './strategies/refresh-jwt.strategy';
import { MerchantTokenCryptoService } from './services/token-crypto.service';
import { MerchantRegisteredHandler } from './services/merchant-registered.handler';
import { InitiateMerchantEmailRegistrationUseCase } from './use-cases/initiate-merchant-email-registration.usecase';
import { CompleteMerchantEmailRegistrationUseCase } from './use-cases/complete-merchant-email-registration.usecase';
import { MerchantLoginWithEmailUseCase } from './use-cases/merchant-login-with-email.usecase';
import { MerchantRefreshTokenUseCase } from './use-cases/merchant-refresh-token.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantAccount, User, Session]),
    PassportModule,
    DatabaseModule,
    QueueModule,
    JwtModule,
  ],
  controllers: [MerchantAuthController],
  providers: [
    MerchantAuthService,
    InitiateMerchantEmailRegistrationUseCase,
    CompleteMerchantEmailRegistrationUseCase,
    MerchantLoginWithEmailUseCase,
    MerchantRefreshTokenUseCase,
    MerchantTokenCryptoService,
    MerchantRegisteredHandler,
    MerchantJwtStrategy,
    MerchantJwtRefreshStrategy,
    MerchantJwtAuthGuard,
    MerchantJwtRefreshAuthGuard,
    { provide: IHasherToken, useClass: Argon2PasswordHasher },
  ],
  exports: [
    MerchantAuthService,
    MerchantJwtAuthGuard,
    MerchantJwtRefreshAuthGuard,
  ],
})
export class MerchantAuthModule {}
