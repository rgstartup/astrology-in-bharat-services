import { Readable } from 'node:stream';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { AbstractStorageDriver } from './abstract.driver';
import type {
  CloudinaryDriverConfig,
  SignedUploadParams,
  SignedUploadOptions,
  StorageDeleteResult,
  StorageDriverType,
  StorageUploadOptions,
  StorageUploadResult,
  StorageUrlOptions,
  VerifyUploadOptions,
  VerifiedUpload,
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
      sign_url: options?.signed ?? false,
      transformation: Object.keys(transformation).length > 0 ? [transformation] : undefined,
    });
  }

  async getSignedUploadParams(
    options?: SignedUploadOptions,
  ): Promise<SignedUploadParams> {
    console.log('[CloudinaryDriver.getSignedUploadParams] options:', JSON.stringify(options));
    console.log('[CloudinaryDriver.getSignedUploadParams] config:', {
      apiKeyPresent: !!this.config.apiKey,
      apiSecretPresent: !!this.config.apiSecret,
      cloudNamePresent: !!this.config.cloudName,
      defaultFolder: this.config.defaultFolder,
    });
    if (!this.config.apiKey || !this.config.apiSecret || !this.config.cloudName) {
      throw new InternalServerErrorException('Cloudinary is not configured');
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = options?.folder ?? this.config.defaultFolder ?? 'uploads';
    const resourceType = options?.resourceType ?? 'image';

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      this.config.apiSecret,
    );

    return {
      signature,
      timestamp,
      apiKey: this.config.apiKey,
      cloudName: this.config.cloudName,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.config.cloudName}/${resourceType}/upload`,
    };
  }

  async verifyUpload(
    publicId: string,
    options?: VerifyUploadOptions,
  ): Promise<VerifiedUpload> {
    try {
      const resourceType = options?.resourceType ?? 'image';
      const asset = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      if (!asset || asset.error) {
        throw new BadRequestException('Cloudinary asset not found');
      }

      // Constrain folder so a signed upload cannot be verified from another folder
      if (options?.folder && asset.public_id && !asset.public_id.startsWith(`${options.folder}/`)) {
        throw new BadRequestException('Asset was uploaded outside the signed folder');
      }

      // Constrain file size
      if (options?.maxSizeBytes !== undefined && asset.bytes && asset.bytes > options.maxSizeBytes) {
        throw new BadRequestException('File exceeds maximum allowed size');
      }

      // Constrain MIME type / format
      if (options?.allowedMimeTypes?.length && asset.format) {
        const mime = this.formatToMime(asset.format, asset.resource_type);
        if (!options.allowedMimeTypes.includes(mime)) {
          throw new BadRequestException(`File type ${mime} is not allowed`);
        }
      }

      return {
        publicId: asset.public_id,
        secureUrl: asset.secure_url,
        width: asset.width,
        height: asset.height,
        format: asset.format,
        bytes: asset.bytes,
        resourceType: asset.resource_type,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Cloudinary verify failed: ${(error as Error).message}`,
      );
    }
  }

  private formatToMime(format: string, resourceType: string): string {
    const ext = String(format).toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      bmp: 'image/bmp',
      tiff: 'image/tiff',
      mp4: 'video/mp4',
      webm: 'video/webm',
      quicktime: 'video/quicktime',
      mov: 'video/quicktime',
    };
    return mimeMap[ext] ?? `${resourceType}/${ext}`;
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
