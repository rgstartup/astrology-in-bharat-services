import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '../../infrastructure/persistence/entities/profile-merchant.entity';
import { UpdateMerchantProfileDto } from '../../api/dto/update-merchant-profile.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UsersFacade } from '@/modules/users/application/users.facade';
import { MerchantGateway } from '../../api/gateways/merchant.gateway';
import { EncryptionService } from '@/common/services/encryption.service';

@Injectable()
export class UpdateMerchantProfileUseCase {
  private readonly logger = new Logger(UpdateMerchantProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    private readonly cloudinary: CloudinaryService,
    private readonly usersFacade: UsersFacade,
    private readonly merchantGateway: MerchantGateway,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(
    userId: number,
    dto: UpdateMerchantProfileDto,
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
    this.logger.log(`[DEBUG] Updating profile for user ${userId}`);
    this.logger.log(`[DEBUG] DTO Data Received: ${JSON.stringify(dto, null, 2)}`);
    this.logger.log(`[DEBUG] Bank Details in DTO: bankName=${dto.bankName}, acc=${dto.accountNumber}, ifsc=${dto.ifsc}`);
    this.logger.log(`[DEBUG] Files keys: ${Object.keys(files || {})}`);

    try {
      let profile = await this.merchantRepository
        .createQueryBuilder('merchant')
        .leftJoinAndSelect('merchant.user', 'user')
        .where('merchant.user_id = :userId', { userId })
        .getOne();

      if (!profile) {
        profile = this.merchantRepository.create({
          user_id: userId,
        });
        // Save immediately to ensure entity exists
        profile = await this.merchantRepository.save(profile);
      }

      // Handle Image upload
      if (files?.image?.[0]) {
        try {
          const uploadResult = await this.cloudinary.uploadImage(files.image[0]);
          if (uploadResult && 'secure_url' in uploadResult) {
            profile.image = uploadResult.secure_url;
            // Also update user avatar as fallback
            await this.usersFacade.update(userId, { avatar: uploadResult.secure_url });
          }
        } catch (error) {
          this.logger.error('Failed to upload shop image', error.stack);
        }
      }

      // Handle Video upload
      if (files?.video?.[0]) {
        try {
          const uploadResult = await this.cloudinary.uploadImage(files.video[0]);
          if (uploadResult && 'secure_url' in uploadResult) {
            profile.video = uploadResult.secure_url;
          }
        } catch (error) {
          this.logger.error('Failed to upload shop video', error.stack);
        }
      }

      // Update basic details
      if (dto.name || dto.shopName) {
        const newName = dto.name || dto.shopName;
        profile.shopName = newName;
        // Also update the user entity name for consistency across the platform
        await this.usersFacade.update(userId, { name: newName });
      }
      if (dto.managerName) profile.managerName = dto.managerName;
      if (dto.phone) profile.phone = dto.phone;
      if (dto.address) profile.address = dto.address;
      if (dto.city) profile.city = dto.city;
      if (dto.pincode) profile.pincode = dto.pincode;
      if (dto.operationalHours) profile.operationalHours = dto.operationalHours;
      if (dto.trustScore) profile.trustScore = dto.trustScore;
      
      // Convert strings to numbers for latitude/longitude (multipart fields)
      if (dto.latitude !== undefined) profile.latitude = Number(dto.latitude);
      if (dto.longitude !== undefined) profile.longitude = Number(dto.longitude);

      // Convert strings to booleans for multipart form data
      const isOnline = dto.isOnline === true || (dto.isOnline as any) === 'true' || (dto.isOnline as any) === 1;
      const statusChanged = dto.isOnline !== undefined && !!profile.isOnline !== !!isOnline;
      if (dto.isOnline !== undefined) profile.isOnline = !!isOnline;

      // Handle new verification fields
      if (dto.gstin) profile.gstin = dto.gstin;
      if (dto.pan && this.encryptionService) {
        profile.pan = this.encryptionService.encrypt(dto.pan);
      }
      if (dto.isGstExempt !== undefined) {
        profile.isGstExempt = dto.isGstExempt === true || (dto.isGstExempt as any) === 'true';
      }
      if (dto.bankName) profile.bankName = dto.bankName;
      if (dto.accountHolder) profile.accountHolder = dto.accountHolder;
      if (dto.accountNumber && this.encryptionService) {
        profile.accountNumber = this.encryptionService.encrypt(dto.accountNumber);
      }
      if (dto.ifsc) profile.ifsc = dto.ifsc;

      // Handle Document Uploads
      const docFields = [
        'gstCertificate',
        'panFront',
        'panBack',
        'aadharFront',
        'aadharBack',
      ] as const;

      for (const field of docFields) {
        if (files?.[field]?.[0]) {
          try {
            const uploadResult = await this.cloudinary.uploadImage(files[field][0]);
            if (uploadResult && 'secure_url' in uploadResult) {
              profile[field] = uploadResult.secure_url;
            }
          } catch (error) {
            this.logger.error(`Failed to upload ${field}`, error.stack);
          }
        }
      }

      await this.merchantRepository.save(profile);

      if (statusChanged && this.merchantGateway) {
        try {
          this.merchantGateway.notifyStatusChange(profile.id, profile.isOnline);
        } catch (e) {
          this.logger.warn(`Failed to notify status change via gateway: ${e.message}`);
        }
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: profile.id,
          name: profile.shopName,
          managerName: profile.managerName,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          pincode: profile.pincode,
          video: profile.video,
          isOnline: profile.isOnline,
          operationalHours: profile.operationalHours,
          trustScore: profile.trustScore,
          latitude: profile.latitude,
          longitude: profile.longitude,
          gstin: profile.gstin,
          pan: dto.pan, 
          isGstExempt: profile.isGstExempt,
          bankName: profile.bankName,
          accountHolder: profile.accountHolder,
          accountNumber: dto.accountNumber,
          ifsc: profile.ifsc,
          gstCertificate: profile.gstCertificate,
          panFront: profile.panFront,
          panBack: profile.panBack,
          aadharFront: profile.aadharFront,
          aadharBack: profile.aadharBack,
          isVerified: profile.isVerified,
        },
      };
    } catch (error) {
      this.logger.error('CRITICAL: UpdateMerchantProfileUseCase failed', error.stack);
      return {
        success: false,
        message: 'Internal server error during profile update',
        error: error.message
      };
    }
  }
}
