import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UploadApiOptions, UploadApiResponse, v2 } from 'cloudinary';
import * as streamifier from 'streamifier';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class ImageUploadService {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof v2) {}

  async uploadImage(
    file: Express.Multer.File,
    options?: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file or buffer provided for upload');
    }

    return new Promise((resolve, reject) => {
      const uploadOptions: UploadApiOptions = {
        resource_type: 'auto',
        ...options,
      };

      const uploadStream = this.cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject(
              new InternalServerErrorException(
                (error as { message?: string })?.message ||
                  'Unknown Cloudinary Error',
              ),
            );
          }
          if (!result || !result.secure_url) {
            return reject(
              new InternalServerErrorException(
                'Cloudinary upload failed: no secure_url returned',
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
    });
  }

  async deleteImage(
    publicId: string,
    options?: Record<string, any>,
  ): Promise<any> {
    if (!publicId) {
      throw new BadRequestException('No public_id provided for image deletion');
    }
    return this.cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      ...options,
    });
  }
}
