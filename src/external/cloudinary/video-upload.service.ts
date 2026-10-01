import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadApiOptions, UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary.provider';
import { Media } from '@/internal/media/entities/media.entity';
import { MediaSource } from '@/internal/media/enum';

/**
 * Result returned after a successful video upload operation.
 */
export type UploadVideoResult = UploadApiResponse & {
  media: Media;
};

@Injectable()
export class VideoUploadService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof v2,
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
  ) {}

  /**
   * Uploads a new video file to Cloudinary and inserts a corresponding
   * record in the Media database table (parity with ImageUploadService).
   */
  async uploadVideo(
    file: Express.Multer.File,
    options?: UploadApiOptions,
  ): Promise<UploadVideoResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'No file or buffer provided for video upload',
      );
    }

    const uploadResult = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
      const uploadOptions: UploadApiOptions = {
        resource_type: 'video',
        chunk_size: 6000000, // 6MB chunk size for large videos
        ...options,
      };

      const uploadStream = this.cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                (error as { message?: string })?.message ||
                  'Unknown Cloudinary Video Error',
              ),
            );
          }
          if (!result || !result.secure_url) {
            return reject(
              new InternalServerErrorException(
                'Cloudinary video upload failed: no secure_url returned',
              ),
            );
          }
          resolve(result);
        },
      );

      const readStream = streamifier.createReadStream(file.buffer);
      readStream.on('error', (err) => reject(err));
      uploadStream.on('error', (err) => reject(err));
      readStream.pipe(uploadStream);
      },
    );

    const media = await this.upsertMedia(file, uploadResult);

    return Object.assign(uploadResult, { media });
  }

  async deleteVideo(
    publicId: string,
    options?: Record<string, any>,
  ): Promise<any> {
    if (!publicId) {
      throw new BadRequestException('No public_id provided for video deletion');
    }
    const result = await this.cloudinary.uploader.destroy(publicId, {
      resource_type: 'video',
      ...options,
    });

    await this.mediaRepository.softDelete({ public_id: publicId });

    return result;
  }

  private async upsertMedia(
    file: Express.Multer.File,
    uploadResult: UploadApiResponse,
    existingPublicId?: string,
  ): Promise<Media> {
    const timestamp = uploadResult.created_at
      ? new Date(uploadResult.created_at)
      : new Date();

    const lookupPublicId = existingPublicId || uploadResult.public_id;

    let media = lookupPublicId
      ? await this.mediaRepository.findOne({
          where: { public_id: lookupPublicId, source: MediaSource.CLOUDINARY },
        })
      : null;

    const mimeType =
      file.mimetype ||
      (uploadResult.format ? `video/${uploadResult.format}` : null);
    const fileName =
      file.originalname || uploadResult.original_filename || null;
    const fileSize = uploadResult.bytes || file.size || null;

    if (media) {
      media.url = uploadResult.secure_url;
      media.public_id = uploadResult.public_id;
      if (mimeType) media.mime_type = mimeType;
      if (fileSize) media.file_size = fileSize;
      if (fileName) media.file_name = fileName;
      media.updated_at = timestamp;
      return this.mediaRepository.save(media);
    }

    media = this.mediaRepository.create({
      url: uploadResult.secure_url,
      source: MediaSource.CLOUDINARY,
      public_id: uploadResult.public_id,
      mime_type: mimeType,
      file_size: fileSize,
      file_name: fileName,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return this.mediaRepository.save(media);
  }
}
