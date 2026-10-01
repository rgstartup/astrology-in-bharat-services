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
import { expertAccounts } from '@/core/drizzledb/schema';
import { VideoUploadService } from '@/external/cloudinary';

const MIN_INTRO_VIDEO_SECONDS = 30;
const MAX_INTRO_VIDEO_SECONDS = 90;

@Injectable()
export class UpdateExpertAccountIntroVideoUseCase {
  private readonly logger = new Logger(
    UpdateExpertAccountIntroVideoUseCase.name,
  );

  constructor(
    private readonly videoUploadService: VideoUploadService,
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
      const result = await this.videoUploadService.uploadVideo(file, {
        public_id,
      });
      const videoUrl = result.secure_url;
      const mediaId = result.media?.id ?? null;

      if (!videoUrl) {
        throw new InternalServerErrorException(
          'Video upload did not return a valid secure URL',
        );
      }

      const duration = Number(
        (result as { duration?: number }).duration ?? 0,
      );
      if (
        Number.isFinite(duration) &&
        duration > 0 &&
        (duration < MIN_INTRO_VIDEO_SECONDS ||
          duration > MAX_INTRO_VIDEO_SECONDS)
      ) {
        if (result.public_id) {
          await this.videoUploadService.deleteVideo(result.public_id);
        }
        throw new BadRequestException(
          `Video duration must be between ${MIN_INTRO_VIDEO_SECONDS} and ${MAX_INTRO_VIDEO_SECONDS} seconds. Your video is ${Math.round(duration)} seconds.`,
        );
      }

      await this.db.transaction(async (tx) => {
        const [account] = await tx
          .select({
            id: expertAccounts.id,
            intro_video: expertAccounts.intro_video,
          })
          .from(expertAccounts)
          .where(eq(expertAccounts.id, Number(expertId)))
          .limit(1);

        if (!account) {
          throw new NotFoundException('Expert not found');
        }

        const introVideo = videoUrl || account.intro_video;
        const updated_at = new Date();

        const accountPatch: Partial<typeof expertAccounts.$inferInsert> = {
          intro_video: introVideo,
          // Keep legacy `video` column in sync for backward compatibility.
          video: introVideo,
          updated_at,
        };
        if (mediaId !== null) {
          accountPatch.intro_video_id = mediaId;
        }

        await tx
          .update(expertAccounts)
          .set(accountPatch)
          .where(eq(expertAccounts.id, account.id));
      });

      return {
        success: true,
        message: 'Intro video uploaded successfully',
        intro_video: videoUrl,
        intro_video_id: mediaId,
        intro_video_media: result.media ?? null,
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
