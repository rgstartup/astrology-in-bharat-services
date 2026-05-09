import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileClient } from './infrastructure/entities/profile-client.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Address } from '@/common/address/address.entity';
import { ProfileController } from './api/controllers/profile.controller';
import { ClientProfileFacade } from './application/profile.facade';
import { GetProfileUseCase } from './application/use-cases/get-profile.usecase';
import { CreateProfileUseCase } from './application/use-cases/create-profile.usecase';
import { UpdateProfileUseCase } from './application/use-cases/update-profile.usecase';
import { UpdateProfilePictureUseCase } from './application/use-cases/update-profile-picture.usecase';
import { UploadDocumentUseCase } from './application/use-cases/upload-document.usecase';
import { SendPhoneOtpUseCase } from './application/use-cases/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from './application/use-cases/verify-phone-otp.usecase';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileClient, User, Address]),
    CloudinaryModule,
  ],
  controllers: [ProfileController],
  providers: [
    ClientProfileFacade,
    GetProfileUseCase,
    CreateProfileUseCase,
    UpdateProfileUseCase,
    UpdateProfilePictureUseCase,
    UploadDocumentUseCase,
    SendPhoneOtpUseCase,
    VerifyPhoneOtpUseCase,
  ],
  exports: [ClientProfileFacade],
})
export class ProfileModule { }

