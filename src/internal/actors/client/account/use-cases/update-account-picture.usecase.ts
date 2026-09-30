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
import { clientAccounts, users } from '@/core/drizzledb/schema';
import { ImageUploadService } from '@/external/cloudinary';

@Injectable()
export class UpdateAccountPictureUseCase {
  private readonly logger = new Logger(UpdateAccountPictureUseCase.name);

  constructor(
    private readonly imageUploadService: ImageUploadService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(clientId: number | string, file: Express.Multer.File, public_id?: string) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    try {
      const result = await this.imageUploadService.uploadImage(file, {
        public_id
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
            id: clientAccounts.id,
            user_id: clientAccounts.user_id,
            avatar: clientAccounts.avatar,
          })
          .from(clientAccounts)
          .where(eq(clientAccounts.id, Number(clientId)))
          .limit(1);

        if (!account) {
          throw new NotFoundException('Client not found');
        }

        const avatar = pictureUrl || account.avatar;
        const updated_at = new Date();

        const accountPatch: Partial<typeof clientAccounts.$inferInsert> = {
          avatar,
          updated_at,
        };
        if (mediaId !== null) {
          accountPatch.avatar_id = mediaId;
        }

        const userPatch: Partial<typeof users.$inferInsert> = {
          avatar,
          updated_at,
        };
        if (mediaId !== null) {
          userPatch.avatar_id = mediaId;
        }

        await Promise.all([
          tx
            .update(clientAccounts)
            .set(accountPatch)
            .where(eq(clientAccounts.id, account.id)),
          tx.update(users).set(userPatch).where(eq(users.id, account.user_id)),
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
