import {
  Injectable,
  Logger,
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ImageUploadService } from '@/external/cloudinary';
import { ClientAccount } from '../entities/account.entity';
import { User } from '@/modules/users/entities/user.entity';
import { DatabaseService } from '@/core/database/database.service';

@Injectable()
export class UpdateAccountPictureUseCase {
  private readonly logger = new Logger(UpdateAccountPictureUseCase.name);

  constructor(
    private readonly imageUploadService: ImageUploadService,
    private readonly db: DatabaseService,
  ) {}

  async execute(clientId: number | string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    try {
      const result = await this.imageUploadService.uploadImage(file);
      const pictureUrl = result.secure_url;
      const mediaId = result.media?.id ?? null;

      if (!pictureUrl) {
        throw new InternalServerErrorException(
          'Image upload did not return a valid secure URL',
        );
      }

      await this.db.transaction(async (queryRunner) => {
        const account = await queryRunner.manager.findOne(ClientAccount, {
          select: {
            id: true,
            avatar: true,
            avatar_id: true,
            user: {
              id: true,
              avatar: true,
              avatar_id: true,
            },
          },
          where: { id: Number(clientId) },
          relations: ['user'],
        });

        if (!account) {
          throw new NotFoundException('Client not found');
        }

        const updatedClient = new ClientAccount();
        updatedClient.id = account.id;
        updatedClient.avatar = pictureUrl || account.avatar;
        if (mediaId !== null) {
          updatedClient.avatar_id = mediaId;
        }

        const updatedUser = new User();
        updatedUser.id = account.user.id;
        updatedUser.avatar = pictureUrl || account.avatar;
        if (mediaId !== null) {
          updatedUser.avatar_id = mediaId;
        }

        return Promise.all([
          queryRunner.manager.save(ClientAccount, updatedClient),
          queryRunner.manager.save(User, updatedUser),
        ]);
      });

      return {
        success: true,
        message: 'Picture uploaded successfully',
        avatar: pictureUrl,
        avatar_id: mediaId,
        avatar_media: result.media ?? null,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to update profile picture for user ${clientId}: ${err.message}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        err.message || 'Failed to upload profile picture',
      );
    }
  }
}
