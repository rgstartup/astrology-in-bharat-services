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
import { expertAccounts, media, users } from '@/core/drizzledb/schema';
import { StorageService } from '@/external/storage';
import { MediaSource } from '@/internal/media/enum';

@Injectable()
export class UpdateExpertAccountAvatarUseCase {
  private readonly logger = new Logger(UpdateExpertAccountAvatarUseCase.name);

  constructor(
    private readonly storageService: StorageService,
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
      const resultFile = await this.storageService.upload(file, {
        resourceType: 'image',
        maxSizeBytes: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
        allowedPrefixes: ['image/'],
        filename: `expert_avatar_${expertId}`,
        publicId: public_id,
        overwrite: true,
        invalidate: true,
      });

      if (!resultFile) {
        throw new InternalServerErrorException(
          'Image upload did not return a valid secure URL',
        );
      }

      const updatedMedia = await this.db.transaction(async (tx) => {
        const [account] = await tx
          .select({
            id: expertAccounts.id,
            user_id: expertAccounts.user_id,
            avatar_id: expertAccounts.avatar_id,
          })
          .from(expertAccounts)
          .leftJoin(media, eq(media.id, expertAccounts.avatar_id))
          .where(eq(expertAccounts.id, Number(expertId)))
          .limit(1);

        if (!account) {
          throw new NotFoundException('Expert not found');
        }

        const updated_at = new Date();
        let avatar_id: number;

        if (account.avatar_id) {
          // Update existing media row.
          const [resultMedia] = await tx
            .update(media)
            .set({
              url: resultFile.secureUrl,
              source: MediaSource.CLOUDINARY,
              public_id: resultFile.key,
              checksum: resultFile.checksum,
              mime_type: resultFile.mimeType,
              file_name: resultFile.originalFilename,
              file_size: resultFile.size,
              storage_provider: resultFile.provider,
              storage_key: resultFile.key,
              updated_at,
            })
            .where(eq(media.id, account.avatar_id))
            .returning({ id: media.id });

          avatar_id = resultMedia.id;
        } else {
          // Insert new media row.
          const [resultMedia] = await tx
            .insert(media)
            .values({
              url: resultFile.secureUrl,
              source: MediaSource.CLOUDINARY,
              public_id: resultFile.key,
              checksum: resultFile.checksum,
              mime_type: resultFile.mimeType,
              file_name: resultFile.originalFilename,
              file_size: resultFile.size,
              storage_provider: resultFile.provider,
              storage_key: resultFile.key,
              created_at: updated_at,
              updated_at,
            })
            .returning({ id: media.id });

          avatar_id = resultMedia.id;
        }

        const accountPatch: Partial<typeof expertAccounts.$inferInsert> = {
          avatar: resultFile.secureUrl,
          avatar_id,
          updated_at,
        };

        const userPatch: Partial<typeof users.$inferInsert> = {
          avatar: resultFile.secureUrl,
          avatar_id,
          updated_at,
        };

        await Promise.all([
          tx
            .update(expertAccounts)
            .set(accountPatch)
            .where(eq(expertAccounts.id, account.id)),
          account.user_id
            ? tx.update(users).set(userPatch).where(eq(users.id, account.user_id))
            : Promise.resolve(),
        ]);

        return { id: avatar_id };
      });

      return {
        success: true,
        message: 'Avatar uploaded successfully',
        avatar_url: resultFile.secureUrl,
        avatar_media: updatedMedia,
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
