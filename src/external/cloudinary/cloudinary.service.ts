import { Injectable } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { ImageUploadService } from './image-upload.service';
import { VideoUploadService } from './video-upload.service';
import { Base64UploadService } from './base64-upload.service';

/**
 * @deprecated Use ImageUploadService, VideoUploadService, or Base64UploadService directly.
 */
@Injectable()
export class CloudinaryService {
  constructor(
    private readonly imageUploadService: ImageUploadService,
    private readonly videoUploadService: VideoUploadService,
    private readonly base64UploadService: Base64UploadService,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (file?.mimetype?.startsWith('video')) {
      return this.videoUploadService.uploadVideo(file);
    }
    return this.imageUploadService.uploadImage(file);
  }

  async uploadBase64(
    base64String: string,
    folder?: string,
  ): Promise<UploadApiResponse> {
    return this.base64UploadService.uploadBase64(base64String, folder);
  }
}
