import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMerchant } from '../../infrastructure/persistence/entities/profile-merchant.entity';
import { UpdateMerchantProfileDto } from '../../api/dto/update-merchant-profile.dto';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';

@Injectable()
export class UpdateMerchantProfileUseCase {
  constructor(
    @InjectRepository(ProfileMerchant)
    private readonly profileRepository: Repository<ProfileMerchant>,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async execute(
    userId: number, 
    dto: UpdateMerchantProfileDto, 
    files?: { image?: Express.Multer.File[]; video?: Express.Multer.File[] }
  ) {
    const profile = await this.profileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('Merchant profile not found');
    }

    // Update basic fields
    profile.shopName = dto.shopName || (dto as any).name || profile.shopName;
    profile.managerName = dto.managerName || profile.managerName;
    profile.phone = dto.phone || profile.phone;
    profile.address = dto.address || profile.address;
    profile.city = dto.city || profile.city;
    profile.pincode = dto.pincode || profile.pincode;

    // Handle Image Upload
    if (files?.image && files.image[0]) {
      const result = await this.cloudinary.uploadImage(files.image[0]);
      profile.image = result.secure_url;
    }

    // Handle Video Upload
    if (files?.video && files.video[0]) {
      const result = await this.cloudinary.uploadImage(files.video[0]);
      profile.video = result.secure_url;
    }

    return this.profileRepository.save(profile);
  }
}
