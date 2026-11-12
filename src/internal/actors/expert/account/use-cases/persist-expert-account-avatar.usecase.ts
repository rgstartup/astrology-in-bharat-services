import {
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

interface PersistAvatarOptions {
  mimeType?: string;
  size?: number;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  resourceType?: string;
}

@Injectable()
export class PersistExpertAccountAvatarUseCase {
  private readonly logger = new Logger(PersistExpertAccountAvatarUseCase.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    expertId: number | string,
    secureUrl: string,
    publicId: string,
    options?: PersistAvatarOptions,
  ) {
    try {
      let oldPublicId: string | null = null;

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

        // Capture old Cloudinary public_id before we overwrite the media row
        if (account.avatar_id) {
          const [oldMedia] = await tx
            .select({ public_id: media.public_id })
            .from(media)
            .where(eq(media.id, account.avatar_id))
            .limit(1);
          oldPublicId = oldMedia?.public_id ?? null;
        }

        const updated_at = new Date();
        let avatar_id: number;

        if (account.avatar_id) {
          const [resultMedia] = await tx
            .update(media)
            .set({
              url: secureUrl,
              source: MediaSource.CLOUDINARY,
              public_id: publicId,
              mime_type: options?.mimeType,
              file_size: options?.bytes,
              storage_provider: 'cloudinary',
              storage_key: publicId,
              updated_at,
            })
            .where(eq(media.id, account.avatar_id))
            .returning({ id: media.id });

          avatar_id = resultMedia.id;
        } else {
          const [resultMedia] = await tx
            .insert(media)
            .values({
              url: secureUrl,
              source: MediaSource.CLOUDINARY,
              public_id: publicId,
              mime_type: options?.mimeType,
              file_size: options?.bytes,
              storage_provider: 'cloudinary',
              storage_key: publicId,
              created_at: updated_at,
              updated_at,
            })
            .returning({ id: media.id });

          avatar_id = resultMedia.id;
        }

        await Promise.all([
          tx
            .update(expertAccounts)
            .set({ avatar: secureUrl, avatar_id, updated_at })
            .where(eq(expertAccounts.id, account.id)),
          account.user_id
            ? tx
                .update(users)
                .set({ avatar: secureUrl, avatar_id, updated_at })
                .where(eq(users.id, account.user_id))
            : Promise.resolve(),
        ]);

        return { id: avatar_id };
      });

      // Delete the old avatar from Cloudinary after the new one is persisted
      if (oldPublicId) {
        try {
          await this.storageService.delete(oldPublicId, {
            resourceType: options?.resourceType ?? 'image',
          });
          this.logger.log(
            `[PersistExpertAccountAvatarUseCase] deleted old avatar ${oldPublicId} for expert ${expertId}`,
          );
        } catch (deleteErr) {
          // Never fail the upload if old-file cleanup fails
          this.logger.error(
            `[PersistExpertAccountAvatarUseCase] failed to delete old avatar ${oldPublicId} for expert ${expertId}: ${(deleteErr as Error).message}`,
          );
        }
      }

      return {
        success: true,
        message: 'Avatar persisted successfully',
        avatar_url: secureUrl,
        avatar_media: updatedMedia,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to persist avatar for expert ${expertId}: ${err.message}`,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        err.message || 'Failed to persist avatar',
      );
    }
  }
}
