import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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

    this.logger.log(`Uploading file: ${file.originalname} (${file.size} bytes)`);

    try {
      const result = await this.cloudinaryService.uploadImage(file);
      this.logger.log(`Upload successful for user ${userId}: ${result.secure_url}`);
      
      return {
        message: 'File uploaded successfully',
        url: result.secure_url,
      };
    } catch (error: any) {
      this.logger.error(`Upload failed for user ${userId}: ${error.message}`);
      // Technical/Infrastructure error
      throw new InternalServerErrorException('File upload failed');
    }
  }
}
