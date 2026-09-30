import { Injectable } from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';
import { ExpertLoginDto } from './dto/expert-login.dto';
import {
  CompleteExpertRegisterDto,
  InitiateExpertRegisterDto,
} from './dto/expert-register.dto';
import {
  InitiateExpertEmailRegistrationUseCase,
  CompleteExpertEmailRegistrationUseCase,
  ExpertLoginWithEmailUseCase,
  ExpertLoginWithGoogleUseCase,
  ExpertRefreshTokenUseCase,
} from './use-cases';

@Injectable()
export class ExpertAuthService {
  constructor(
    private readonly initiateRegistration: InitiateExpertEmailRegistrationUseCase,
    private readonly completeRegistration: CompleteExpertEmailRegistrationUseCase,
    private readonly login: ExpertLoginWithEmailUseCase,
    private readonly refresh: ExpertRefreshTokenUseCase,
    private readonly loginWithGoogleUseCase: ExpertLoginWithGoogleUseCase,
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

  loginWithGoogle(
    dto: {
      providerId: string;
      email: string;
      name?: string;
      oauthProfile?: Profile;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.loginWithGoogleUseCase.execute(dto, ipAddress, userAgent);
  }

  refreshToken(refreshToken: string) {
    return this.refresh.execute(refreshToken);
  }
}
