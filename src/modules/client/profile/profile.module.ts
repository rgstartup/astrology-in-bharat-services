import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileClient } from './infrastructure/persistence/entities/profile-client.entity';
import { ProfileController } from './api/controllers/profile.controller';
import { ProfileFacade } from './application/profile.facade';
import { GetProfileUseCase } from './application/use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './application/use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.usecase';
import { UpdateProfilePictureUseCase } from './application/use-cases/update-profile-picture.usecase';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.usecase';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileClient]),
    CloudinaryModule,
  ],
  controllers: [ProfileController],
  providers: [
    ProfileFacade,
    GetProfileUseCase,
    CreateProfileUseCase,
    UpdateProfileUseCase,
    UpdateProfilePictureUseCase,
    UploadDocumentUseCase,
  ],
  exports: [ProfileFacade],
})
export class ProfileModule {}
