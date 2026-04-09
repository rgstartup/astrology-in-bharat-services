import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileMerchant } from './infrastructure/persistence/entities/profile-merchant.entity';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { Wishlist } from '@/modules/wishlist/infrastructure/persistence/entities/wishlist.entity';

import { GetMerchantDetailsUseCase } from './application/use-cases/get-merchant-details.use-case';
import { GetAllMerchantsUseCase } from './application/use-cases/get-all-merchants.use-case';
import { GetUniqueMerchantCitiesUseCase } from './application/use-cases/get-unique-merchant-cities.use-case';
import { GetMerchantProfileUseCase } from './application/use-cases/get-merchant-profile.use-case';
import { UpdateMerchantProfileUseCase } from './application/use-cases/update-merchant-profile.use-case';
import { MerchantPublicController } from './api/controllers/merchant-public.controller';
import { MerchantProfileController } from './api/controllers/merchant-profile.controller';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfileMerchant, User, Wishlist]),
    CloudinaryModule,
    UsersModule,
  ],
  controllers: [MerchantPublicController, MerchantProfileController],
  providers: [
    GetMerchantDetailsUseCase,
    GetAllMerchantsUseCase,
    GetUniqueMerchantCitiesUseCase,
    GetMerchantProfileUseCase,
    UpdateMerchantProfileUseCase,
  ],
  exports: [
    TypeOrmModule,
    GetMerchantDetailsUseCase,
    GetAllMerchantsUseCase,
    GetUniqueMerchantCitiesUseCase,
    GetMerchantProfileUseCase,
    UpdateMerchantProfileUseCase,
  ],
})
export class ProfileModule { }
