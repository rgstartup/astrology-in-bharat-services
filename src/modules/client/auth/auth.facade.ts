import { Injectable } from '@nestjs/common';
import { InitiateClientEmailRegistrationUseCase } from './use-cases/initiate-client-email-registration.usecase';
import { CompleteClientEmailRegistrationUseCase } from './use-cases/complete-client-email-registration.usecase';
import {
  CompleteClientRegisterDto,
  InitiateClientRegisterDto,
} from './dto/client-register.dto';
import { ClientLoginDto } from './dto/client-login.dto';
import { ClientLoginWithEmailUseCase } from './use-cases/client-login-with-email.usecase';
import { ClientLoginWithGoogleUseCase } from './use-cases/client-login-with-google.usecase';
import { Profile } from 'passport-google-oauth20';

@Injectable()
export class ClientAuthFacade {
  constructor(
    private readonly initiateClientEmailRegistrationUseCase: InitiateClientEmailRegistrationUseCase,
    private readonly completeClientEmailRegistrationUseCase: CompleteClientEmailRegistrationUseCase,
    private readonly clientLoginWithEmailUseCase: ClientLoginWithEmailUseCase,
    private readonly clientLoginWithGoogleUseCase: ClientLoginWithGoogleUseCase,
  ) {}

  async initiateEmailRegistration(dto: InitiateClientRegisterDto) {
    return this.initiateClientEmailRegistrationUseCase.execute(dto.email);
  }

  async completeEmailRegistration(
    dto: CompleteClientRegisterDto,
    ip?: string,
    ua?: string,
  ) {
    return this.completeClientEmailRegistrationUseCase.execute(dto, ip, ua);
  }

  async loginWithEmail(
    dto: ClientLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.clientLoginWithEmailUseCase.execute(dto, ipAddress, userAgent);
  }

  async loginWithGoogle(
    dto: {
      providerId: string;
      email: string;
      name?: string;
      oauthProfile?: Profile;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.clientLoginWithGoogleUseCase.execute(dto, ipAddress, userAgent);
  }
}
