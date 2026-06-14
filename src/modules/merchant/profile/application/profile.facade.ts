import { Injectable } from '@nestjs/common';
import { GetMerchantProfileUseCase } from './use-cases/get-merchant-profile.use-case';
import { UpdateMerchantProfileUseCase } from './use-cases/update-merchant-profile.use-case';
import { UpdateProfileWithQueryRunnerUseCase } from './use-cases/update-profile-with-query-runner.usecase';
import { GetAdminMerchantsUseCase } from './use-cases/get-admin-merchants.use-case';
import { UpdateMerchantStatusAdminUseCase } from './use-cases/update-merchant-status-admin.use-case';
import { QueryRunner } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '../infrastructure/entities/profile-merchant.entity';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class MerchantProfileFacade {
  constructor(
    private readonly getMerchantProfileUseCase: GetMerchantProfileUseCase,
    private readonly updateMerchantProfileUseCase: UpdateMerchantProfileUseCase,
    private readonly updateProfileWithQueryRunnerUseCase: UpdateProfileWithQueryRunnerUseCase,
    private readonly getAdminMerchantsUseCase: GetAdminMerchantsUseCase,
    private readonly updateMerchantStatusAdminUseCase: UpdateMerchantStatusAdminUseCase,
    @InjectRepository(ProfileMerchant)
    private readonly repo: Repository<ProfileMerchant>,
  ) {}

  getProfile(user: IUser) {
    return this.getMerchantProfileUseCase.execute(user);
  }

  getProfileById(merchantId: string) {
    return this.repo.findOne({ where: { id: merchantId } });
  }

  getProfileByUserId(userId: string) {
    return this.repo.findOne({
      where: {
        user_id: userId,
      },
    });
  }

  getRawProfiles() {
    return this.repo.find({ relations: ['user'] });
  }

  updateProfile(
    user: IUser,
    dto: Record<string, unknown>,
    files?: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
      gstCertificate?: Express.Multer.File[];
      panFront?: Express.Multer.File[];
      panBack?: Express.Multer.File[];
      aadharFront?: Express.Multer.File[];
      aadharBack?: Express.Multer.File[];
    },
  ) {
    return this.updateMerchantProfileUseCase.execute(user, dto, files);
  }

  updateProfileWithQueryRunner(
    userId: string,
    dto: Partial<ProfileMerchant>,
    queryRunner: QueryRunner,
  ) {
    return this.updateProfileWithQueryRunnerUseCase.execute(
      userId,
      dto,
      queryRunner,
    );
  }

  getAdminMerchants(params: Record<string, unknown>) {
    return this.getAdminMerchantsUseCase.execute(params);
  }

  updateAdminMerchantStatus(id: string, status: string, _remarks?: string) {
    return this.updateMerchantStatusAdminUseCase.execute(id, { status });
  }
}
