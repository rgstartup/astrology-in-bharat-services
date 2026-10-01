import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { expertAccounts, users } from '@/core/drizzledb/schema';
import { ImageUploadService } from '@/external/cloudinary';

@Injectable()
export class UpdateExpertAccountAvatarUseCase {
  private readonly logger = new Logger(UpdateExpertAccountAvatarUseCase.name);

  constructor(
    private readonly imageUploadService: ImageUploadService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(
    expertId: number | string,
    file: Express.Multer.File,
    public_id?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    try {
      const result = await this.imageUploadService.uploadImage(file, {
        public_id,
      });
      const pictureUrl = result.secure_url;
      const mediaId = result.media?.id ?? null;

      if (!pictureUrl) {
        throw new InternalServerErrorException(
          'Image upload did not return a valid secure URL',
        );
      }

      await this.db.transaction(async (tx) => {
        const [account] = await tx
          .select({
            id: expertAccounts.id,
            user_id: expertAccounts.user_id,
            avatar: expertAccounts.avatar,
          })
          .from(expertAccounts)
          .where(eq(expertAccounts.id, Number(expertId)))
          .limit(1);

        if (!account) {
          throw new NotFoundException('Expert not found');
        }

        const avatar = pictureUrl || account.avatar;
        const updated_at = new Date();

        const accountPatch: Partial<typeof expertAccounts.$inferInsert> = {
          avatar,
          updated_at,
        };
        if (mediaId !== null) {
          accountPatch.avatar_id = mediaId;
        }

        const accountUpdate = tx
          .update(expertAccounts)
          .set(accountPatch)
          .where(eq(expertAccounts.id, account.id));

        if (account.user_id) {
          const userPatch: Partial<typeof users.$inferInsert> = {
            avatar,
            updated_at,
          };
          if (mediaId !== null) {
            userPatch.avatar_id = mediaId;
          }
          const userUpdate = tx
            .update(users)
            .set(userPatch)
            .where(eq(users.id, account.user_id));
          await Promise.all([accountUpdate, userUpdate]);
        } else {
          await accountUpdate;
        }
      });

      return {
        success: true,
        message: 'Avatar uploaded successfully',
        avatar: pictureUrl,
        avatar_id: mediaId,
        avatar_media: result.media ?? null,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to update avatar for expert ${expertId}: ${err.message}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        err.message || 'Failed to upload avatar',
      );
    }
  }
}
