import { Injectable } from '@nestjs/common';
import { InitiateClientEmailRegistrationUseCase } from './initiate-client-email-registration.usecase';
import { CompleteClientEmailRegistrationUseCase } from './complete-client-email-registration.usecase';
import { CompleteClientRegisterDto, InitiateClientRegisterDto } from '@/modules/auth/api/dto/client/client-register.dto';
import { ClientLoginDto } from '@/modules/auth/api/dto/client/client-login.dto';
import { ClientLoginWithEmailUseCase } from './client-login-with-email.usecase';
import { ClientLoginWithGoogleUseCase } from './client-login-with-google.usecase';


@Injectable()
export class ClientAuthFacade {
    constructor(
        private readonly initiateClientEmailRegistrationUseCase: InitiateClientEmailRegistrationUseCase,
        private readonly completeClientEmailRegistrationUseCase: CompleteClientEmailRegistrationUseCase,
        private readonly clientLoginWithEmailUseCase: ClientLoginWithEmailUseCase,
        private readonly clientLoginWithGoogleUseCase: ClientLoginWithGoogleUseCase,
    ) { }

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

    async loginWithEmail(dto: ClientLoginDto, ipAddress?: string, userAgent?: string) {
        return this.clientLoginWithEmailUseCase.execute(dto, ipAddress, userAgent);
    }

    async loginWithGoogle(dto: any, ipAddress?: string, userAgent?: string) {
        return this.clientLoginWithGoogleUseCase.execute(dto, ipAddress, userAgent);
    }

}
