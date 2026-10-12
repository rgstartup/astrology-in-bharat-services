import { Readable } from 'node:stream';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { AbstractStorageDriver } from './abstract.driver';
import type {
  CloudinaryDriverConfig,
  StorageDeleteResult,
  StorageDriverType,
  StorageUploadOptions,
  StorageUploadResult,
  StorageUrlOptions,
} from '../storage.types';

/**
 * GoF Strategy & Adapter: Cloudinary Storage Driver
 */
@Injectable()
export class CloudinaryDriver extends AbstractStorageDriver {
  readonly name: StorageDriverType = 'cloudinary';
  private readonly logger = new Logger(CloudinaryDriver.name);
  private readonly config: CloudinaryDriverConfig;

  constructor(config: CloudinaryDriverConfig) {
    super();
    this.config = config;

    if (config.cloudName && config.apiKey && config.apiSecret) {
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
        secure: config.secure ?? true,
      });
    }
  }

  async uploadStream(
    stream: Readable,
    options?: StorageUploadOptions,
    preloadedBuffer?: Buffer,
  ): Promise<StorageUploadResult> {
    const folder = options?.folder ?? this.config.defaultFolder ?? 'uploads';
    const resourceType = options?.resourceType ?? 'auto';

    const uploadOptions: UploadApiOptions = {
      folder,
      resource_type: resourceType,
      public_id: options?.publicId,
      overwrite: options?.overwrite ?? false,
      invalidate: options?.invalidate ?? true,
      tags: options?.tags,
      ...options?.providerOptions,
    };

    const res = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error || !result?.secure_url) {
            const msg = error?.message || 'Cloudinary upload failed';
            this.logger.error(msg);
            return reject(new InternalServerErrorException(msg));
          }
          resolve(result);
        },
      );

      stream.on('error', (err) => reject(err));
      uploadStream.on('error', (err) => reject(err));
      stream.pipe(uploadStream);
    });

    const format = res.format ? String(res.format) : undefined;
    const mimeType =
      options?.mimeType || (format ? `image/${format}` : this.inferMimeType(options?.filename));

    return {
      url: res.secure_url || res.url,
      secureUrl: res.secure_url,
      key: res.public_id,
      size: res.bytes,
      mimeType,
      format,
      originalFilename: options?.filename || res.original_filename,
      checksum: preloadedBuffer ? this.calculateChecksum(preloadedBuffer) : undefined,
      provider: 'cloudinary',
      metadata: {
        width: res.width,
        height: res.height,
        resourceType: res.resource_type,
        createdAt: res.created_at,
      },
      raw: res,
    };
  }

  async delete(
    key: string,
    options?: Record<string, unknown>,
  ): Promise<StorageDeleteResult> {
    try {
      const resourceType = (options?.resourceType as string) || 'image';
      const result = await cloudinary.uploader.destroy(key, {
        resource_type: resourceType,
        invalidate: true,
        ...options,
      });

      return {
        success: result.result === 'ok' || result.result === 'not found',
        key,
        provider: 'cloudinary',
        raw: result,
      };
    } catch (error) {
      this.logger.error(`Cloudinary delete failed: ${(error as Error).message}`);
      return { success: false, key, provider: 'cloudinary', raw: error };
    }
  }

  getUrl(key: string, options?: StorageUrlOptions): string {
    const transformation: Record<string, unknown> = {};
    if (options?.width) transformation.width = options.width;
    if (options?.height) transformation.height = options.height;
    if (options?.crop) transformation.crop = options.crop;
    if (options?.quality) transformation.quality = options.quality;
    if (options?.format) transformation.fetch_format = options.format;

    return cloudinary.url(key, {
      secure: true,
      transformation: Object.keys(transformation).length > 0 ? [transformation] : undefined,
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const res = await cloudinary.api.resource(key);
      return Boolean(res?.public_id);
    } catch {
      return false;
    }
  }
}
