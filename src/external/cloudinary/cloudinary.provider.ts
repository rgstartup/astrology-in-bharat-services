import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryConfig } from '@/config/cloudinary.config';

export const CLOUDINARY = Symbol('CLOUDINARY');

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  useFactory: (config: ConfigService) => {
    const cloudinaryConfig = config.get<CloudinaryConfig>('cloudinary');

    if (!cloudinaryConfig) {
      throw new Error('Cloudinary config not found');
    }

    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
    });

    return cloudinary;
  },
  inject: [ConfigService],
};
