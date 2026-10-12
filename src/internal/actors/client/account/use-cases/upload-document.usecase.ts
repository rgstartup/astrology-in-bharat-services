import { StorageService } from '@/external/storage';
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class UploadDocumentUseCase {
  private readonly logger = new Logger(UploadDocumentUseCase.name);

  constructor(private readonly storageService: StorageService) {}

  async execute(userId: number | string, file: Express.Multer.File) {
    this.logger.log(`Received upload request from user: ${userId}`);

    if (!file) {
      this.logger.warn(`No file found in request from user: ${userId}`);
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = await this.storageService.uploadDocument(file, {
        filename: `doc_${userId}_${Date.now()}`,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSizeBytes: 50 * 1024 * 1024, // 50MB
      });

      if (!result.secureUrl) {
        throw new InternalServerErrorException(
          'Document upload did not return a valid secure URL',
        );
      }

      return {
        message: 'File uploaded successfully',
        url: result.secureUrl,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Upload failed for user ${userId}: ${err.message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }
}
