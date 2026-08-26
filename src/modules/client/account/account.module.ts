import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientAccount } from './entities/account.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Address } from '@/common/address/address.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { AccountController } from './controllers/account.controller';
import { AccountFacade } from './account.facade';
import { GetAccountUseCase } from './use-cases/get-account.usecase';
import { CreateAccountUseCase } from './use-cases/create-account.usecase';
import { UpdateAccountUseCase } from './use-cases/update-account.usecase';
import { UpdateAccountPictureUseCase } from './use-cases/update-account-picture.usecase';
import { UploadDocumentUseCase } from './use-cases/upload-document.usecase';
import { SendPhoneOtpUseCase } from './use-cases/send-phone-otp.usecase';
import { VerifyPhoneOtpUseCase } from './use-cases/verify-phone-otp.usecase';

const useCases = [
  GetAccountUseCase,
  CreateAccountUseCase,
  UpdateAccountUseCase,
  UpdateAccountPictureUseCase,
  UploadDocumentUseCase,
  SendPhoneOtpUseCase,
  VerifyPhoneOtpUseCase,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientAccount, User, Address]),
    CloudinaryModule,
  ],
  controllers: [AccountController],
  providers: [AccountFacade, ...useCases],
  exports: [AccountFacade, TypeOrmModule],
})
export class AccountModule {}
