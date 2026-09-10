import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UploadApiOptions, UploadApiResponse, v2 } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class Base64UploadService {
  constructor(@Inject(CLOUDINARY) private readonly cloudinary: typeof v2) {}

  async uploadBase64(
    base64String: string,
    folder?: string,
    options?: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    if (!base64String) {
      throw new BadRequestException('No base64 string provided for upload');
    }

    return new Promise((resolve, reject) => {
      void this.cloudinary.uploader.upload(
        base64String,
        {
          folder,
          resource_type: 'auto',
          ...options,
        },
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
    });
  }
}
