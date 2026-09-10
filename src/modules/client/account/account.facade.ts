import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { GetAccountUseCase } from './use-cases/get-account.usecase';
import { CreateAccountUseCase } from './use-cases/create-account.usecase';
import { UpdateAccountUseCase } from './use-cases/update-account.usecase';
import { UpdateAccountPictureUseCase } from './use-cases/update-account-picture.usecase';
import { UploadDocumentUseCase } from './use-cases/upload-document.usecase';
import { SendPhoneOtpUseCase } from './use-cases/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from './use-cases/verify-phone-otp.usecase';
import {
  CreateClientAccountDto,
  UpdateClientAccountDto,
} from './dto/account.dto';
import { SendPhoneOtpDto, VerifyPhoneOtpDto } from './dto/phone-otp.dto';
import { ClientAccount } from './entities/account.entity';

@Injectable()
export class AccountFacade {
  constructor(
    private readonly getAccountUseCase: GetAccountUseCase,
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly updateAccountUseCase: UpdateAccountUseCase,
    private readonly updateAccountPictureUseCase: UpdateAccountPictureUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly sendPhoneOtpUseCase: SendPhoneOtpUseCase,
    private readonly verifyPhoneOtpUseCase: VerifyPhoneOtpUseCase,
  ) {}

  async getAccount(
    client: ClientAccount | { id: string },
    queryRunner?: QueryRunner,
  ): Promise<ClientAccount | null> {
    return this.getAccountUseCase.execute(client, queryRunner);
  }

  async createAccount(
    userId: string,
    dto: CreateClientAccountDto,
    queryRunner?: QueryRunner,
  ): Promise<ClientAccount> {
    return this.createAccountUseCase.execute(userId, dto, queryRunner);
  }

  async updateAccount(
    client: ClientAccount | { id: string },
    dto: UpdateClientAccountDto,
  ) {
    return this.updateAccountUseCase.execute(client, dto);
  }

  async updateAccountPicture(clientId: string, file: Express.Multer.File) {
    return this.updateAccountPictureUseCase.execute(clientId, file);
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    return this.uploadDocumentUseCase.execute(userId, file);
  }

  async sendPhoneOtp(userId: string, dto: SendPhoneOtpDto) {
    return this.sendPhoneOtpUseCase.execute(userId, dto);
  }

  async verifyPhoneOtp(userId: string, dto: VerifyPhoneOtpDto) {
    return this.verifyPhoneOtpUseCase.execute(userId, dto);
  }
}
