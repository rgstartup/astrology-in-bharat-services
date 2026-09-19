import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from '@/modules/media/entities/media.entity';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { ImageUploadService } from './image-upload.service';
import { VideoUploadService } from './video-upload.service';
import { Base64UploadService } from './base64-upload.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Media])],
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

