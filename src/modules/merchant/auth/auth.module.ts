import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { MerchantAccount } from '../account/entities/account.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { DatabaseModule } from '@/core/database/database.module';
import { QueueModule } from '@/core/queue/queue.module';
import { JwtModule } from '@/core/jwt/jwt.module';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { Argon2PasswordHasher } from '@/modules/auth/infrastructure/hashing/argon2-password.hasher';
import { MerchantAuthController } from './controllers/auth.controller';
import { MerchantAuthFacade } from './auth.facade';
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
    MerchantAuthFacade,
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
  exports: [MerchantAuthFacade, MerchantJwtAuthGuard, MerchantJwtRefreshAuthGuard],
})
export class MerchantAuthModule {}
