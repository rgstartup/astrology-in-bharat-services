import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileMerchant } from './infrastructure/persistence/entities/profile-merchant.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { UpdateMerchantProfileUseCase } from './application/use-cases/update-merchant-profile.usecase';
import { GetMerchantProfileByUserIdUseCase } from './application/use-cases/get-merchant-profile-by-userid.usecase';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileMerchant, User]),
    CloudinaryModule,
  ],
  controllers: [],
  providers: [UpdateMerchantProfileUseCase, GetMerchantProfileByUserIdUseCase],
  exports: [TypeOrmModule, UpdateMerchantProfileUseCase, GetMerchantProfileByUserIdUseCase],
})
export class ProfileModule { }
