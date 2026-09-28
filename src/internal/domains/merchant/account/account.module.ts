import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/internal/users/entities/user.entity';
import { CloudinaryModule } from '@/external/cloudinary/cloudinary.module';
import { MerchantAuthModule } from '../auth/auth.module';
import { MerchantAccount } from './entities/account.entity';
import { MerchantAccountController } from './controllers/account.controller';
import { MerchantAccountService } from './account.service';
import { GetMerchantAccountUseCase } from './use-cases/get-account.usecase';
import { UpdateMerchantAccountUseCase } from './use-cases/update-account.usecase';
import { UpdateMerchantStatusUseCase } from './use-cases/update-status.usecase';
import { QueryMerchantAccountsUseCase } from './use-cases/query-accounts.usecase';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantAccount, User]),
    forwardRef(() => MerchantAuthModule),
    CloudinaryModule,
  ],
  controllers: [MerchantAccountController],
  providers: [
    MerchantAccountService,
    GetMerchantAccountUseCase,
    UpdateMerchantAccountUseCase,
    UpdateMerchantStatusUseCase,
    QueryMerchantAccountsUseCase,
  ],
  exports: [MerchantAccountService, TypeOrmModule],
})
export class MerchantAccountModule {}
