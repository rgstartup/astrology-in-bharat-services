import { Injectable } from '@nestjs/common';
import { LoginWithEmailUseCase } from './use-cases/login-with-email.usecase';
import { RegisterUserUseCase } from './use-cases/register-user.usecase';
import { AgentRegisterUserUseCase } from './use-cases/agent-register-user.usecase';
import { MerchantRegisterUserUseCase } from './use-cases/merchant-register-user.usecase';
import { LoginDto, RegisterDto, AgentRegisterUserDto } from '../api/dto';
import { MerchantRegisterDto } from '../api/dto/merchant-register.dto';
import { LogoutUserUseCase } from './use-cases/logout-user.usecase';
import { VerifyEmailUseCase } from './use-cases/verify-email.usecase';
import { ResendVerificationEmailUseCase } from './use-cases/resend-verification-email.usecase';
import { ForgotPasswordUseCase } from './use-cases/forgot-password.usecase';
import { ResetPasswordUseCase } from './use-cases/reset-password.usecase';
import { RefreshTokenUseCase } from './use-cases/refresh-token.usecase';
import { SendMagicLinkUseCase } from './use-cases/send-magic-link.usecase';
import { LoginWithMagicLinkUseCase } from './use-cases/login-with-magic-link.usecase';
import { GetMerchantProfileUseCase } from './use-cases/get-merchant-profile.usecase';
import { InitiateEmailRegistrationUseCase } from './use-cases/initiate-email-registration.usecase';
import { CompleteEmailRegistrationUseCase } from './use-cases/complete-email-registration.usecase';
import {
  InitiateRegisterDto,
  CompleteRegisterDto,
} from '../api/dto/email-register.dto';
import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';

@Injectable()
export class AuthFacade {
  constructor(
    private readonly loginWithEmailUseCase: LoginWithEmailUseCase,
    private readonly registerUser: RegisterUserUseCase,
    private readonly agentRegisterUserUseCase: AgentRegisterUserUseCase,
    private readonly merchantRegisterUserUseCase: MerchantRegisterUserUseCase,
    private readonly logoutUser: LogoutUserUseCase,
    private readonly verifyEmailForUser: VerifyEmailUseCase,
    private readonly resendVerificationEmailForUser: ResendVerificationEmailUseCase,
    private readonly forgotPasswordUserCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly sendMagicLinkUseCase: SendMagicLinkUseCase,
    private readonly loginWithMagicLinkUseCase: LoginWithMagicLinkUseCase,
    private readonly getMerchantProfileUseCase: GetMerchantProfileUseCase,
    private readonly initiateEmailRegistrationUseCase: InitiateEmailRegistrationUseCase,
    private readonly completeEmailRegistrationUseCase: CompleteEmailRegistrationUseCase,
  ) {}

  async loginWithEmail(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    return this.loginWithEmailUseCase.execute(dto, ipAddress, userAgent);
  }

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    return this.registerUser.execute(dto, ipAddress, userAgent);
  }

  async logout(userId: string) {
    return this.logoutUser.execute(userId);
  }

  async verifyEmail(token: string) {
    return this.verifyEmailForUser.execute(token);
  }

  async resendVerificationEmail(email: string) {
    return this.resendVerificationEmailForUser.execute(email);
  }

  async forgotPassword(email: string) {
    return this.forgotPasswordUserCase.execute(email);
  }

  async resetPassword(token: string, password: string) {
    return this.resetPasswordUseCase.execute(token, password);
  }

  async refreshToken(refreshToken: string) {
    return this.refreshTokenUseCase.execute(refreshToken);
  }

  async sendMagicLink(email: string) {
    return this.sendMagicLinkUseCase.execute(email);
  }

  async loginWithMagicLink(
    token: string,
    role: RoleEnum,
    ip?: string,
    ua?: string,
  ) {
    return this.loginWithMagicLinkUseCase.execute(token, role, ip, ua);
  }

  async agentRegister(dto: AgentRegisterUserDto, agentId: string) {
    return this.agentRegisterUserUseCase.execute(dto, agentId);
  }

  async merchantRegister(
    dto: MerchantRegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.merchantRegisterUserUseCase.execute(dto, ipAddress, userAgent);
  }

  async getMerchantProfile(userId: string) {
    return this.getMerchantProfileUseCase.execute(userId);
  }

  async initiateEmailRegistration(dto: InitiateRegisterDto) {
    return this.initiateEmailRegistrationUseCase.execute(dto.email, dto.role);
  }

  async completeEmailRegistration(
    dto: CompleteRegisterDto,
    ip?: string,
    ua?: string,
  ) {
    return this.completeEmailRegistrationUseCase.execute(dto, ip, ua);
  }
}
