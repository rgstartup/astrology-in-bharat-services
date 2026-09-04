import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';

@Injectable()
export class UploadDocumentUseCase {
  private readonly logger = new Logger(UploadDocumentUseCase.name);

  constructor(private readonly cloudinaryService: CloudinaryService) {}

  async execute(userId: string, file: Express.Multer.File) {
    this.logger.log(`Received upload request from user: ${userId}`);

    if (!file) {
      this.logger.warn(`No file found in request from user: ${userId}`);
      throw new BadRequestException('No file uploaded');
    }

    try {
      const result = (await this.cloudinaryService.uploadImage(file)) as {
        secure_url: string;
      };

      return {
        message: 'File uploaded successfully',
        url: result.secure_url,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Upload failed for user ${userId}: ${err.message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }
}
