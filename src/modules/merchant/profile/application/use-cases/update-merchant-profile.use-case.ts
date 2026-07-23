import { RoleEnum } from '@/modules/users/infrastructure/enums/Role.enum';
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { BooleanMessage } from '@/common/dto/boolean-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ProfileMerchant } from '../../infrastructure/entities/profile-merchant.entity';
import { UpdateMerchantProfileDto } from '../../api/dto/update-merchant-profile.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { MerchantGateway } from '../../api/gateways/merchant.gateway';
import { EncryptionService } from '@/common/services/encryption.service';
import { NotificationFacade } from '@/modules/notification/application/notification.facade';
import { NotificationType } from '@/modules/notification/infrastructure/entities/notification.entity';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class UpdateMerchantProfileUseCase {
  private readonly logger = new Logger(UpdateMerchantProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    private readonly cloudinary: CloudinaryService,
    private readonly merchantGateway: MerchantGateway,
    private readonly encryptionService: EncryptionService,
    private readonly notificationFacade: NotificationFacade,
    private readonly dataSource: DataSource,
  ) {}

  async execute(
    user: IUser,
    dto: UpdateMerchantProfileDto,
    files?: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
      gallery?: Express.Multer.File[];
      gstCertificate?: Express.Multer.File[];
      panFront?: Express.Multer.File[];
      panBack?: Express.Multer.File[];
      aadharFront?: Express.Multer.File[];
      aadharBack?: Express.Multer.File[];
    },
  ) {
    const userId = user.id;
    this.logger.log(`[DEBUG] Updating profile for user ${userId}`);
    this.logger.log(
      `[DEBUG] DTO Data Received: ${JSON.stringify(dto, null, 2)}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const whereClause = user.profile
        ? { id: user.profile, user: { id: userId } }
        : { user: { id: userId } };
      let profile = await queryRunner.manager.findOne(ProfileMerchant, {
        where: whereClause,
        relations: ['user'],
      });

      if (!profile) {
        profile = queryRunner.manager.create(ProfileMerchant, {
          user: { id: userId } as User,
        });
        profile = await queryRunner.manager.save(ProfileMerchant, profile);
      }

      let newAvatar: string | undefined = undefined;

      // Handle Image upload
      if (files?.image?.[0]) {
        try {
          const uploadResult = (await this.cloudinary.uploadImage(
            files.image[0],
          )) as Record<string, unknown>;
          if (uploadResult && 'secure_url' in uploadResult) {
            profile.image = uploadResult.secure_url as string;
            newAvatar = uploadResult.secure_url as string;
          }
        } catch (error: unknown) {
          this.logger.error(
            'Failed to upload shop image',
            (error as Error).stack,
          );
        }
      }

      // Handle Video upload
      if (files?.video?.[0]) {
        try {
          const uploadResult = (await this.cloudinary.uploadImage(
            files.video[0],
          )) as Record<string, unknown>;
          if (uploadResult && 'secure_url' in uploadResult) {
            profile.video = uploadResult.secure_url as string;
          }
        } catch (error: unknown) {
          this.logger.error(
            'Failed to upload shop video',
            (error as Error).stack,
          );
        }
      }

      let newName: string | undefined = undefined;

      // Update basic details
      if (dto.name || dto.shopName) {
        newName = (dto.name || dto.shopName) as string;
        profile.shopName = newName ?? null;
      }
      if (dto.managerName) profile.managerName = dto.managerName;
      if (dto.phone) profile.phone = dto.phone;
      if (dto.address) profile.address = dto.address;
      if (dto.city) profile.city = dto.city;
      if (dto.pincode) profile.pincode = dto.pincode;
      if (dto.operationalHours) profile.operationalHours = dto.operationalHours;
      if (dto.trustScore) profile.trustScore = dto.trustScore;

      // Convert strings to numbers for latitude/longitude (multipart fields)
      if (dto.latitude !== undefined && dto.latitude !== '') {
        const lat = Number(dto.latitude);
        if (!isNaN(lat)) profile.latitude = lat;
      }
      if (dto.longitude !== undefined && dto.longitude !== '') {
        const lng = Number(dto.longitude);
        if (!isNaN(lng)) profile.longitude = lng;
      }

      // Convert strings to booleans for multipart form data
      const isOnline =
        dto.isOnline === true || dto.isOnline === 'true' || dto.isOnline === 1;

      if (dto.isOnline !== undefined && isOnline) {
        if (profile.user?.is_blocked) {
          throw new ForbiddenException('Your account has been blocked by the administrator. You cannot perform this action.');
        }
        if (profile.status !== 'active') {
          throw new ForbiddenException('Your account is inactive. You cannot go online.');
        }
      }

      const statusChanged =
        dto.isOnline !== undefined && !!profile.isOnline !== !!isOnline;
      if (dto.isOnline !== undefined) profile.isOnline = !!isOnline;

      if (dto.description !== undefined) profile.description = dto.description;
      if (dto.establishedSince !== undefined) profile.established = dto.establishedSince;

      if (dto.features !== undefined) {
        if (typeof dto.features === 'string') {
          try {
            profile.features = JSON.parse(dto.features);
          } catch (e: unknown) {
            this.logger.error('Failed to parse features JSON', (e as Error).stack);
          }
        } else {
          profile.features = dto.features as string[];
        }
      }

      // Handle new verification fields
      if (dto.gstin) profile.gstin = dto.gstin;
      if (dto.pan && this.encryptionService) {
        profile.pan = this.encryptionService.encrypt(dto.pan) || null;
      }
      if (dto.isGstExempt !== undefined) {
        profile.isGstExempt =
          dto.isGstExempt === true || dto.isGstExempt === 'true';
      }
      if (dto.bankName) profile.bankName = dto.bankName;
      if (dto.accountHolder) profile.accountHolder = dto.accountHolder;
      if (dto.accountNumber && this.encryptionService) {
        profile.accountNumber =
          this.encryptionService.encrypt(dto.accountNumber) || null;
      }
      if (dto.ifsc) profile.ifsc = dto.ifsc;

      // Handle multiple bank accounts
      if (dto.bank_accounts) {
        if (typeof dto.bank_accounts === 'string') {
          try {
            profile.bank_accounts = JSON.parse(
              dto.bank_accounts,
            ) as typeof profile.bank_accounts;
          } catch (e: unknown) {
            this.logger.error(
              'Failed to parse bank_accounts JSON',
              (e as Error).stack,
            );
          }
        } else {
          profile.bank_accounts = dto.bank_accounts;
        }
      }

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
            const uploadResult = (await this.cloudinary.uploadImage(
              files[field][0],
            )) as Record<string, unknown>;
            if (uploadResult && 'secure_url' in uploadResult) {
              profile[field] = uploadResult.secure_url as string;
            }
          } catch (error: unknown) {
            this.logger.error(
              `Failed to upload ${field}`,
              (error as Error).stack,
            );
          }
        }
      }

      // Handle Gallery Uploads
      let galleryUrls: string[] = [];
      if (dto.gallery) {
        if (typeof dto.gallery === 'string') {
          try {
            const parsed = JSON.parse(dto.gallery);
            if (Array.isArray(parsed)) galleryUrls = parsed;
          } catch (e: unknown) {
            this.logger.error('Failed to parse gallery JSON', (e as Error).stack);
          }
        } else if (Array.isArray(dto.gallery)) {
          galleryUrls = dto.gallery as string[];
        }
      }
      
      if (files?.gallery?.length) {
        for (const file of files.gallery) {
          try {
            const uploadResult = (await this.cloudinary.uploadImage(
              file,
            )) as Record<string, unknown>;
            if (uploadResult && 'secure_url' in uploadResult) {
              galleryUrls.push(uploadResult.secure_url as string);
            }
          } catch (error: unknown) {
            this.logger.error('Failed to upload gallery image', (error as Error).stack);
          }
        }
      }
      
      // Update gallery only if either existing URLs were sent or new files were uploaded
      if (dto.gallery !== undefined || files?.gallery?.length) {
        profile.gallery = galleryUrls;
      }

      // Detect bank details change for security notification
      const bankDetailsChanged =
        (dto.bankName !== undefined && dto.bankName !== profile.bankName) ||
        (dto.accountNumber !== undefined &&
          dto.accountNumber !==
            (profile.accountNumber
              ? this.encryptionService.decrypt(profile.accountNumber)
              : '')) ||
        (dto.bank_accounts !== undefined &&
          JSON.stringify(dto.bank_accounts) !==
            JSON.stringify(profile.bank_accounts));

      await queryRunner.manager.save(ProfileMerchant, profile);

      // Update User name / avatar inside the same transaction
      const userUpdates: Record<string, unknown> = {};
      if (newName) userUpdates.name = newName;
      if (newAvatar) userUpdates.avatar = newAvatar;

      if (Object.keys(userUpdates).length > 0) {
        await queryRunner.manager.update(User, userId, userUpdates);
      }

      await queryRunner.commitTransaction();

      // Trigger security notification if bank details changed
      if (bankDetailsChanged) {
        try {
          await this.notificationFacade.create(
            profile.id,
            RoleEnum.MERCHANT,
            NotificationType.GENERAL,
            'Security Alert: Bank Details Updated',
            'Your bank account information has been updated. If you did not make this change, please contact support immediately for security.',
            { type: 'security_alert', timestamp: new Date() },
          );
        } catch (err) {
          this.logger.error('Failed to send security notification', err);
        }
      }

      if (statusChanged && this.merchantGateway) {
        try {
          this.merchantGateway.notifyStatusChange(
            profile.id.toString() as any,
            profile.isOnline,
          );
        } catch (e: unknown) {
          this.logger.warn(
            `Failed to notify status change via gateway: ${(e as Error).message}`,
          );
        }
      }

      return new BooleanMessage(true, 'Profile updated successfully');
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      this.logger.error(
        'CRITICAL: UpdateMerchantProfileUseCase failed',
        (error as Error).stack,
      );
      return new BooleanMessage(
        false,
        'Internal server error during profile update',
      );
    } finally {
      await queryRunner.release();
    }
  }
}
