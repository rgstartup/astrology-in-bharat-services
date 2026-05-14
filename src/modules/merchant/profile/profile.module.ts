import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileMerchant } from './infrastructure/entities/profile-merchant.entity';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { Wishlist } from '@/modules/commerce/wishlist/infrastructure/entities/wishlist.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { UsersModule } from '@/modules/users/users.module';
import { NotificationModule } from '@/modules/notification/notification.module';

import { GetMerchantDetailsUseCase } from './application/use-cases/get-merchant-details.use-case';
import { GetAllMerchantsUseCase } from './application/use-cases/get-all-merchants.use-case';
import { GetUniqueMerchantCitiesUseCase } from './application/use-cases/get-unique-merchant-cities.use-case';
import { GetMerchantProfileUseCase } from './application/use-cases/get-merchant-profile.use-case';
import { UpdateMerchantProfileUseCase } from './application/use-cases/update-merchant-profile.use-case';

import { MerchantPublicController } from './api/controllers/merchant-public.controller';
import { MerchantProfileController } from './api/controllers/merchant-profile.controller';
import { MerchantGateway } from './api/gateways/merchant.gateway';
import { EncryptionService } from '@/common/services/encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileMerchant, User, Wishlist]),
    CloudinaryModule,
    UsersModule,
    NotificationModule,
  ],
  controllers: [MerchantPublicController, MerchantProfileController],
  providers: [
    GetMerchantDetailsUseCase,
    GetAllMerchantsUseCase,
    GetUniqueMerchantCitiesUseCase,
    GetMerchantProfileUseCase,
    UpdateMerchantProfileUseCase,
    MerchantGateway,
    EncryptionService,
  ],
  exports: [
    TypeOrmModule,
    GetMerchantDetailsUseCase,
    GetAllMerchantsUseCase,
    GetUniqueMerchantCitiesUseCase,
    GetMerchantProfileUseCase,
    UpdateMerchantProfileUseCase,
    EncryptionService,
  ],
})
export class ProfileModule { }
