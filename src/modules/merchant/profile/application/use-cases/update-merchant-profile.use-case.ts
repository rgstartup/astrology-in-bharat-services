import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '../../infrastructure/persistence/entities/profile-merchant.entity';
import { UpdateMerchantProfileDto } from '../../api/dto/update-merchant-profile.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UsersFacade } from '@/modules/users/application/users.facade';

@Injectable()
export class UpdateMerchantProfileUseCase {
  private readonly logger = new Logger(UpdateMerchantProfileUseCase.name);

  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly merchantRepository: Repository<ProfileMerchant>,
    private readonly cloudinary: CloudinaryService,
    private readonly usersFacade: UsersFacade,
  ) {}

  async execute(
    userId: number,
    dto: UpdateMerchantProfileDto,
    files?: { image?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) {
    const profile = await this.merchantRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Merchant profile not found');
    }

    // Handle Image upload
    if (files?.image?.[0]) {
      try {
        const uploadResult = await this.cloudinary.uploadImage(files.image[0]);
        profile.image = uploadResult.secure_url;
        // Also update user avatar as fallback
        await this.usersFacade.update(userId, { avatar: uploadResult.secure_url });
      } catch (error) {
        this.logger.error('Failed to upload shop image', error.stack);
      }
    }

    // Handle Video upload
    if (files?.video?.[0]) {
      try {
        const uploadResult = await this.cloudinary.uploadImage(files.video[0]);
        profile.video = uploadResult.secure_url;
      } catch (error) {
        this.logger.error('Failed to upload shop video', error.stack);
      }
    }

    // Update basic details
    if (dto.name) profile.shopName = dto.name;
    if (dto.managerName) profile.managerName = dto.managerName;
    if (dto.phone) profile.phone = dto.phone;
    if (dto.address) profile.address = dto.address;
    if (dto.city) profile.city = dto.city;
    if (dto.pincode) profile.pincode = dto.pincode;

    await this.merchantRepository.save(profile);

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
      },
    };
  }
}
