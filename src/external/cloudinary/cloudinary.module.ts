import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { ImageUploadService } from './image-upload.service';
import { VideoUploadService } from './video-upload.service';
import { Base64UploadService } from './base64-upload.service';

@Module({
  imports: [ConfigModule],
  providers: [
    CloudinaryProvider,
    ImageUploadService,
    VideoUploadService,
    Base64UploadService,
    CloudinaryService,
  ],
  exports: [
    ImageUploadService,
    VideoUploadService,
    Base64UploadService,
    CloudinaryService,
  ],
})
export class CloudinaryModule {}

