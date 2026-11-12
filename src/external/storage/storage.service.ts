import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  IStorageDriver,
  StorageDeleteResult,
  StorageDriverType,
  StorageFileInput,
  StorageUploadOptions,
  StorageUploadResult,
  StorageUrlOptions,
  SignedUploadParams,
  SignedUploadOptions,
  VerifiedUpload,
  VerifyUploadOptions,
} from './storage.types';
import { StorageFactory } from './storage.factory';

/**
 * GoF Facade: Storage Service
 */
@Injectable()
export class StorageService {
  constructor(private readonly factory: StorageFactory) {}

  disk(driver: StorageDriverType): IStorageDriver {
    return this.factory.getDriver(driver);
  }

  async upload(file: StorageFileInput, options?: StorageUploadOptions): Promise<StorageUploadResult> {
    return this.factory.getDefaultDriver().upload(file, options);
  }

  async uploadBase64(base64: string, options?: StorageUploadOptions): Promise<StorageUploadResult> {
    return this.upload(base64, options);
  }

  async uploadImage(file: StorageFileInput, options?: StorageUploadOptions): Promise<StorageUploadResult> {
    return this.upload(file, { folder: 'images', resourceType: 'image', ...options });
  }

  async uploadVideo(file: StorageFileInput, options?: StorageUploadOptions): Promise<StorageUploadResult> {
    return this.upload(file, { folder: 'videos', resourceType: 'video', ...options });
  }

  async uploadDocument(file: StorageFileInput, options?: StorageUploadOptions): Promise<StorageUploadResult> {
    return this.upload(file, { folder: 'documents', resourceType: 'raw', ...options });
  }

  async delete(key: string, options?: Record<string, unknown> & { disk?: StorageDriverType }): Promise<StorageDeleteResult> {
    const driver = options?.disk ? this.factory.getDriver(options.disk) : this.factory.getDefaultDriver();
    return driver.delete(key, options);
  }

  getUrl(key: string, options?: StorageUrlOptions & { disk?: StorageDriverType }): string {
    const driver = options?.disk ? this.factory.getDriver(options.disk) : this.factory.getDefaultDriver();
    return driver.getUrl(key, options);
  }

  async exists(key: string, disk?: StorageDriverType): Promise<boolean> {
    const driver = disk ? this.factory.getDriver(disk) : this.factory.getDefaultDriver();
    return driver.exists(key);
  }

  async getSignedUploadParams(options?: SignedUploadOptions): Promise<SignedUploadParams> {
    console.log('[StorageService.getSignedUploadParams] options:', JSON.stringify(options));
    const driver = this.factory.getDefaultDriver();
    console.log('[StorageService.getSignedUploadParams] driver name:', driver.name);
    if (!driver.getSignedUploadParams) {
      throw new BadRequestException('Signed upload is not supported by the default driver');
    }
    return driver.getSignedUploadParams(options);
  }

  async verifyUpload(publicId: string, options?: VerifyUploadOptions): Promise<VerifiedUpload> {
    const driver = this.factory.getDefaultDriver();
    if (!driver.verifyUpload) {
      throw new BadRequestException('Upload verify is not supported by the default driver');
    }
    return driver.verifyUpload(publicId, options);
  }
}
