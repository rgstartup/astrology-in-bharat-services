import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '@/core/drizzledb/drizzle.constants';
import type { DrizzleDb } from '@/core/drizzledb/drizzle.types';
import { clientAccounts, users, media } from '@/core/drizzledb/schema';
import { StorageService } from '@/external/storage';
import { ResourceNotFoundError } from '@/shared/errors';

@Injectable()
export class UpdateAccountPictureUseCase {
  private readonly logger = new Logger(UpdateAccountPictureUseCase.name);

  constructor(
    private readonly storageService: StorageService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async execute(
    clientId: number | string,
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
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedPrefixes: ['image/'],
        filename: `client_avatar_${clientId}`,
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
            id: clientAccounts.id,
            user_id: clientAccounts.user_id,
            avatar_id: clientAccounts.avatar_id,
          })
          .from(clientAccounts)
          .leftJoin(media, eq(media.id, clientAccounts.avatar_id))
          .where(eq(clientAccounts.id, Number(clientId)))
          .limit(1);

        if (!account.avatar_id) {
          throw new ResourceNotFoundError('client', Number(clientId));
        }

        // update media
        const [resultMedia] = await tx
          .update(media)
          .set({
            url: resultFile.secureUrl,
            public_id: resultFile.key,
            checksum: resultFile.checksum,
            mime_type: resultFile.mimeType,
            file_name: resultFile.originalFilename,
            file_size: resultFile.size,
            storage_provider: resultFile.provider,
            storage_key: resultFile.key,
            alt_text: `${clientAccounts.name}`,
          })
          .where(eq(media.id, account.avatar_id))
          .returning({ id: media.id });

        const avatar_id = resultMedia.id;
        const updated_at = new Date();

        const accountPatch: Partial<typeof clientAccounts.$inferInsert> = {
          avatar_id,
          updated_at,
        };

        const userPatch: Partial<typeof users.$inferInsert> = {
          avatar_id,
          updated_at,
        };

        await Promise.all([
          tx
            .update(clientAccounts)
            .set(accountPatch)
            .where(eq(clientAccounts.id, account.id)),
          tx.update(users).set(userPatch).where(eq(users.id, account.user_id)),
        ]);

        return resultMedia;
      });

      return {
        success: true,
        message: 'Picture uploaded successfully',
        avatar_url: resultFile.secureUrl,
        avatar_media: updatedMedia,
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
