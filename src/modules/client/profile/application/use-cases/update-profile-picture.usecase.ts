import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UpdateProfileUseCase } from './update-profile.usecase';
import { IUser } from '@/common/types/access-token.payload';

@Injectable()
export class UpdateProfilePictureUseCase {
  private readonly logger = new Logger(UpdateProfilePictureUseCase.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
  ) {}

  async execute(user: IUser, file: Express.Multer.File) {
    try {
      const result = (await this.cloudinaryService.uploadImage(file)) as {
        secure_url: string;
      };
      return this.updateProfileUseCase.execute(user, {
        profile_picture: result.secure_url,
      });
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to update profile picture for user ${user.id}: ${err.message}`,
      );
      // Technical/Infrastructure error
      throw new InternalServerErrorException(
        'Failed to upload profile picture',
      );
    }
  }
}
