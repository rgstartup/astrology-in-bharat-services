import { Injectable } from '@nestjs/common';
import { QueryRunner } from 'typeorm';
import { ProfileClient } from '../infrastructure/entities/profile-client.entity';
import { GetProfileUseCase } from './use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './use-cases/update-profile.usecase';
import { UpdateProfilePictureUseCase } from './use-cases/update-profile-picture.usecase';
import { UploadDocumentUseCase } from './use-cases/upload-document.usecase';
import { SendPhoneOtpUseCase } from './use-cases/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from './use-cases/verify-phone-otp.usecase';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from '../infrastructure/dto/profile-client.dto';
import { UpdateClientProfileWithQueryRunnerUseCase } from './use-cases/update-profile-with-query-runner.usecase';
import { IUser } from '@/common/types/access-token.payload';

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
    private readonly updateClientProfileWithQueryRunnerUseCase: UpdateClientProfileWithQueryRunnerUseCase,
  ) {}

  async getProfile(user: IUser, queryRunner?: QueryRunner) {
    return this.getProfileUseCase.execute(user, queryRunner);
  }

  async createProfile(
    userId: string,
    dto: CreateProfileClientDto,
    queryRunner?: QueryRunner,
  ) {
    return this.createProfileUseCase.execute(userId, dto, queryRunner);
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

  async updateProfileWithQueryRunner(
    userId: string,
    updates: Partial<ProfileClient>,
    queryRunner: QueryRunner,
  ) {
    return this.updateClientProfileWithQueryRunnerUseCase.execute(
      userId,
      updates,
      queryRunner,
    );
  }
}
