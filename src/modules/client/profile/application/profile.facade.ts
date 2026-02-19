import { Injectable } from '@nestjs/common';
import { GetProfileUseCase } from './use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './use-cases/update-profile.usecase';
import { UpdateProfilePictureUseCase } from './use-cases/update-profile-picture.usecase';
import { UploadDocumentUseCase } from './use-cases/upload-document.usecase';
import { CreateProfileClientDto, UpdateProfileClientDto } from '../infrastructure/persistence/dto/profile-client.dto';

@Injectable()
export class ProfileFacade {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly createProfileUseCase: CreateProfileUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly updateProfilePictureUseCase: UpdateProfilePictureUseCase,
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
  ) {}

  async getProfile(userId: number) {
    return this.getProfileUseCase.execute(userId);
  }

  async createProfile(userId: number, dto: CreateProfileClientDto) {
    return this.createProfileUseCase.execute(userId, dto);
  }

  async updateProfile(userId: number, dto: UpdateProfileClientDto) {
    return this.updateProfileUseCase.execute(userId, dto);
  }

  async updateProfilePicture(userId: number, file: Express.Multer.File) {
    return this.updateProfilePictureUseCase.execute(userId, file);
  }

  async uploadDocument(userId: number, file: Express.Multer.File) {
    return this.uploadDocumentUseCase.execute(userId, file);
  }
}
