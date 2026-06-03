import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { GetProfileUseCase } from './use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './use-cases/update-profile.usecase';
import { UpdateProfilePictureUseCase } from './use-cases/update-profile-picture.usecase';
import { UploadDocumentUseCase } from './use-cases/upload-document.usecase';
import { SendPhoneOtpUseCase } from './use-cases/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from './use-cases/verify-phone-otp.usecase';
import { CreateProfileClientDto, UpdateProfileClientDto } from '../infrastructure/dto/profile-client.dto';
import { IUser } from '@/common/decorators/current-user.decorator';

@Injectable()
export class ClientProfileFacade {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly createProfileUseCase: CreateProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly updateProfilePictureUseCase: UpdateProfilePictureUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly sendPhoneOtpUseCase: SendPhoneOtpUseCase,
    private readonly verifyPhoneOtpUseCase: VerifyPhoneOtpUseCase,
  ) { }

  async getProfile(user: IUser, queryRunner?: QueryRunner) {
    return this.getProfileUseCase.execute(user, queryRunner);
  }

  async createProfile(user: IUser, dto: CreateProfileClientDto, queryRunner?: QueryRunner) {
    return this.createProfileUseCase.execute(user, dto, queryRunner);
  }

  async updateProfile(user: IUser, dto: UpdateProfileClientDto) {
    return this.updateProfileUseCase.execute(user, dto);
  }

  async updateProfilePicture(user: IUser, file: Express.Multer.File) {
    return this.updateProfilePictureUseCase.execute(user, file);
  }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    return this.uploadDocumentUseCase.execute(userId, file);
  }

  async sendPhoneOtp(userId: string, phone: string) {
    return this.sendPhoneOtpUseCase.execute(userId, phone);
  }

  async verifyPhoneOtp(userId: string, phone: string, code: string) {
    return this.verifyPhoneOtpUseCase.execute(userId, phone, code);
  }
}
