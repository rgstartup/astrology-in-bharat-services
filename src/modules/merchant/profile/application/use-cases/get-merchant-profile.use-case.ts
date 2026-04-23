import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant, MerchantStatus } from '../../infrastructure/persistence/entities/profile-merchant.entity';
import { EncryptionService } from '@/common/services/encryption.service';

@Injectable()
export class GetMerchantProfileUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(userId: number) {
    const profile = await this.merchantRepository
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.user', 'user')
      .where('merchant.user_id = :userId', { userId })
      .getOne();

    console.log('--- DEEP PROFILE DEBUG (GET) ---');
    if (profile) {
      console.log('Object Keys:', Object.keys(profile));
      console.log('isVerified property:', profile.isVerified);
      console.log('Raw is_verified (snake):', (profile as any).is_verified);
    }
    console.log('------------------------------');

    if (!profile) {
      return {
        success: true,
        exists: false,
        data: {
          id: null,
          name: '',
          managerName: '',
          phone: '',
          address: '',
          city: '',
          pincode: '',
          image: null,
          video: null,
          status: MerchantStatus.PENDING_VERIFICATION,
          isOnline: true,
          operationalHours: '10:00 AM - 08:30 PM',
          trustScore: '99.8',
          latitude: null,
          longitude: null,
          gstin: null,
          pan: null,
          isGstExempt: false,
          bankName: null,
          accountHolder: null,
          accountNumber: null,
          ifsc: null,
          gstCertificate: null,
          panFront: null,
          panBack: null,
          aadharFront: null,
          aadharBack: null,
          isVerified: false,
        },
      };
    }

    return {
      success: true,
      exists: true,
      data: {
        id: profile.id,
        name: profile.shopName || (profile as any).user?.name || '',
        managerName: profile.managerName,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        pincode: profile.pincode,
        image: profile.user?.avatar,
        video: profile.video,
        status: profile.status,
        isOnline: profile.isOnline,
        operationalHours: profile.operationalHours,
        trustScore: profile.trustScore,
        latitude: profile.latitude,
        longitude: profile.longitude,
        gstin: profile.gstin,
        pan: this.encryptionService.decrypt(profile.pan),
        isGstExempt: profile.isGstExempt,
        bankName: profile.bankName,
        accountHolder: profile.accountHolder,
        accountNumber: this.encryptionService.decrypt(profile.accountNumber),
        ifsc: profile.ifsc,
        gstCertificate: profile.gstCertificate,
        panFront: profile.panFront,
        panBack: profile.panBack,
        aadharFront: profile.aadharFront,
        aadharBack: profile.aadharBack,
        isVerified: profile.status === MerchantStatus.ACTIVE,
      },
    };
  }
}


