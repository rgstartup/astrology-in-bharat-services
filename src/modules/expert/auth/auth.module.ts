import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ExpertAccount } from '../account/entities/account.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Session } from '@/modules/auth/infrastructure/entities/session.entity';
import { DatabaseModule } from '@/core/database/database.module';
import { QueueModule } from '@/core/queue/queue.module';
import { JwtModule } from '@/core/jwt/jwt.module';
import { IHasherToken } from '@/common/contracts/hasher.contract';
import { Argon2PasswordHasher } from '@/modules/auth/infrastructure/hashing/argon2-password.hasher';
import { ExpertAuthController } from './controllers/auth.controller';
import { ExpertAuthFacade } from './auth.facade';
import { ExpertJwtAuthGuard } from './guards/auth.guard';
import { ExpertJwtRefreshAuthGuard } from './guards/refresh-auth.guard';
import { ExpertJwtStrategy } from './strategies/jwt.strategy';
import { ExpertJwtRefreshStrategy } from './strategies/refresh-jwt.strategy';
import { ExpertTokenCryptoService } from './services/token-crypto.service';
import { ExpertRegisteredHandler } from './services/expert-registered.handler';
import { InitiateExpertEmailRegistrationUseCase } from './use-cases/initiate-expert-email-registration.usecase';
import { CompleteExpertEmailRegistrationUseCase } from './use-cases/complete-expert-email-registration.usecase';
import { ExpertLoginWithEmailUseCase } from './use-cases/expert-login-with-email.usecase';
import { ExpertRefreshTokenUseCase } from './use-cases/expert-refresh-token.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpertAccount, User, Session]),
    PassportModule,
    DatabaseModule,
    QueueModule,
    JwtModule,
  ],
  controllers: [ExpertAuthController],
  providers: [
    ExpertAuthFacade,
    InitiateExpertEmailRegistrationUseCase,
    CompleteExpertEmailRegistrationUseCase,
    ExpertLoginWithEmailUseCase,
    ExpertRefreshTokenUseCase,
    ExpertTokenCryptoService,
    ExpertRegisteredHandler,
    ExpertJwtStrategy,
    ExpertJwtRefreshStrategy,
    ExpertJwtAuthGuard,
    ExpertJwtRefreshAuthGuard,
    { provide: IHasherToken, useClass: Argon2PasswordHasher },
  ],
  exports: [ExpertAuthFacade, ExpertJwtAuthGuard, ExpertJwtRefreshAuthGuard],
})
export class ExpertAuthModule {}
