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
import { expertAccounts, media } from '@/core/drizzledb/schema';
import { StorageService } from '@/external/storage';
import { MediaSource } from '@/internal/media/enum';

const MIN_INTRO_VIDEO_SECONDS = 30;
const MAX_INTRO_VIDEO_SECONDS = 90;

@Injectable()
export class UpdateExpertAccountIntroVideoUseCase {
  private readonly logger = new Logger(
    UpdateExpertAccountIntroVideoUseCase.name,
  );

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
      throw new BadRequestException('No video file provided');
    }

    try {
      const resultFile = await this.storageService.uploadVideo(file, {
        publicId: public_id,
      });

      if (!resultFile) {
        throw new InternalServerErrorException(
          'Video upload did not return a valid secure URL',
        );
      }

      const videoUrl = resultFile.secureUrl;

      // Validate duration (30-90 seconds) using raw Cloudinary response.
      const duration = Number(
        (resultFile.raw as { duration?: number | string })?.duration ?? 0,
      );
      if (
        Number.isFinite(duration) &&
        duration > 0 &&
        (duration < MIN_INTRO_VIDEO_SECONDS ||
          duration > MAX_INTRO_VIDEO_SECONDS)
      ) {
        // Clean up invalid upload.
        await this.storageService.delete(resultFile.key, {
          resourceType: 'video',
        });
        throw new BadRequestException(
          `Video duration must be between ${MIN_INTRO_VIDEO_SECONDS} and ${MAX_INTRO_VIDEO_SECONDS} seconds. Your video is ${Math.round(duration)} seconds.`,
        );
      }

      const updatedMedia = await this.db.transaction(async (tx) => {
        const [account] = await tx
          .select({
            id: expertAccounts.id,
            intro_video_id: expertAccounts.intro_video_id,
          })
          .from(expertAccounts)
          .where(eq(expertAccounts.id, Number(expertId)))
          .limit(1);

        if (!account) {
          throw new NotFoundException('Expert not found');
        }

        const updated_at = new Date();
        let intro_video_id: number;

        if (account.intro_video_id) {
          // Update existing media row.
          const [resultMedia] = await tx
            .update(media)
            .set({
              url: videoUrl,
              source: MediaSource.CLOUDINARY,
              public_id: resultFile.key,
              mime_type: resultFile.mimeType,
              file_name: resultFile.originalFilename,
              file_size: resultFile.size,
              storage_provider: resultFile.provider,
              storage_key: resultFile.key,
              updated_at,
            })
            .where(eq(media.id, account.intro_video_id))
            .returning({ id: media.id });

          intro_video_id = resultMedia.id;
        } else {
          // Insert new media row.
          const [resultMedia] = await tx
            .insert(media)
            .values({
              url: videoUrl,
              source: MediaSource.CLOUDINARY,
              public_id: resultFile.key,
              mime_type: resultFile.mimeType,
              file_name: resultFile.originalFilename,
              file_size: resultFile.size,
              storage_provider: resultFile.provider,
              storage_key: resultFile.key,
              created_at: updated_at,
              updated_at,
            })
            .returning({ id: media.id });

          intro_video_id = resultMedia.id;
        }

        const accountPatch: Partial<typeof expertAccounts.$inferInsert> = {
          intro_video: videoUrl,
          // Keep legacy `video` column in sync for backward compatibility.
          video: videoUrl,
          intro_video_id,
          updated_at,
        };

        await tx
          .update(expertAccounts)
          .set(accountPatch)
          .where(eq(expertAccounts.id, account.id));

        return { id: intro_video_id };
      });

      return {
        success: true,
        message: 'Intro video uploaded successfully',
        intro_video: videoUrl,
        intro_video_id: updatedMedia.id,
        intro_video_media: updatedMedia,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to update intro video for expert ${expertId}: ${err.message}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        err.message || 'Failed to upload intro video',
      );
    }
  }
}
