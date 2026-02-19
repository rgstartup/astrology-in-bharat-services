import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UpdateProfileUseCase } from './update-profile.usecase';

@Injectable()
export class UpdateProfilePictureUseCase {
  private readonly logger = new Logger(UpdateProfilePictureUseCase.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  async execute(userId: number, file: Express.Multer.File) {
    try {
      const result = await this.cloudinaryService.uploadImage(file);
      return this.updateProfileUseCase.execute(userId, {
        profile_picture: result.secure_url,
      });
    } catch (error: any) {
      this.logger.error(`Failed to update profile picture for user ${userId}: ${error.message}`);
      // Technical/Infrastructure error
      throw new InternalServerErrorException('Failed to upload profile picture');
    }
  }
}
