import { Injectable } from '@nestjs/common';
import { InitiateMerchantRegisterDto, CompleteMerchantRegisterDto } from './dto/merchant-register.dto';
import { MerchantLoginDto } from './dto/merchant-login.dto';
import { InitiateMerchantEmailRegistrationUseCase } from './use-cases/initiate-merchant-email-registration.usecase';
import { CompleteMerchantEmailRegistrationUseCase } from './use-cases/complete-merchant-email-registration.usecase';
import { MerchantLoginWithEmailUseCase } from './use-cases/merchant-login-with-email.usecase';
import { MerchantRefreshTokenUseCase } from './use-cases/merchant-refresh-token.usecase';

@Injectable()
export class MerchantAuthFacade {
  constructor(
    private readonly initiateRegistrationUseCase: InitiateMerchantEmailRegistrationUseCase,
    private readonly completeRegistrationUseCase: CompleteMerchantEmailRegistrationUseCase,
    private readonly loginUseCase: MerchantLoginWithEmailUseCase,
    private readonly refreshTokenUseCase: MerchantRefreshTokenUseCase,
  ) {}

  initiateEmailRegistration(dto: InitiateMerchantRegisterDto) {
    return this.initiateRegistrationUseCase.execute(dto.email);
  }

  completeEmailRegistration(
    dto: CompleteMerchantRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    return this.completeRegistrationUseCase.execute(dto, ip, userAgent);
  }

  loginWithEmail(dto: MerchantLoginDto, ip?: string, userAgent?: string) {
    return this.loginUseCase.execute(dto, ip, userAgent);
  }

  refreshToken(token: string, ip?: string, userAgent?: string) {
    return this.refreshTokenUseCase.execute(token, ip, userAgent);
  }
}
