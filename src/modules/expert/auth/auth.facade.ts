import { Injectable } from '@nestjs/common';
import { ExpertLoginDto } from './dto/expert-login.dto';
import {
  CompleteExpertRegisterDto,
  InitiateExpertRegisterDto,
} from './dto/expert-register.dto';
import { InitiateExpertEmailRegistrationUseCase } from './use-cases/initiate-expert-email-registration.usecase';
import { CompleteExpertEmailRegistrationUseCase } from './use-cases/complete-expert-email-registration.usecase';
import { ExpertLoginWithEmailUseCase } from './use-cases/expert-login-with-email.usecase';
import { ExpertRefreshTokenUseCase } from './use-cases/expert-refresh-token.usecase';

@Injectable()
export class ExpertAuthFacade {
  constructor(
    private readonly initiateRegistration: InitiateExpertEmailRegistrationUseCase,
    private readonly completeRegistration: CompleteExpertEmailRegistrationUseCase,
    private readonly login: ExpertLoginWithEmailUseCase,
    private readonly refresh: ExpertRefreshTokenUseCase,
  ) {}

  initiateEmailRegistration(dto: InitiateExpertRegisterDto) {
    return this.initiateRegistration.execute(dto.email);
  }

  completeEmailRegistration(
    dto: CompleteExpertRegisterDto,
    ip?: string,
    userAgent?: string,
  ) {
    return this.completeRegistration.execute(dto, ip, userAgent);
  }

  loginWithEmail(dto: ExpertLoginDto, ip?: string, userAgent?: string) {
    return this.login.execute(dto, ip, userAgent);
  }

  refreshToken(refreshToken: string) {
    return this.refresh.execute(refreshToken);
  }
}
