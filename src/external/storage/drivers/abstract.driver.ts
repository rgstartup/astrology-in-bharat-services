import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import type {
  IStorageDriver,
  StorageDeleteResult,
  StorageDriverType,
  StorageFileInput,
  StorageUploadOptions,
  StorageUploadResult,
  StorageUrlOptions,
} from '../storage.types';
import { UploadAdapterResolver } from '../adapters/adapter.resolver';
import { CompositeFileValidator } from '../validators/composite.validator';

/**
 * GoF Template Method: Abstract Storage Driver
 */
export abstract class AbstractStorageDriver implements IStorageDriver {
  abstract readonly name: StorageDriverType;
  protected readonly uploadResolver = new UploadAdapterResolver();
  protected readonly fileValidator = new CompositeFileValidator();

  async upload(
    file: StorageFileInput,
    options?: StorageUploadOptions,
  ): Promise<StorageUploadResult> {
    if (file instanceof Readable) {
      return this.uploadStream(file, options);
    }

    const adapted = this.uploadResolver.adapt(file, options);

    // Validate payload against size, MIME-type, and custom rules
    this.fileValidator.validate(adapted, options);

    const mergedOptions: StorageUploadOptions = {
      ...options,
      filename: options?.filename || adapted.originalFilename,
      mimeType: options?.mimeType || adapted.mimeType,
    };

    return this.uploadStream(Readable.from(adapted.buffer), mergedOptions, adapted.buffer);
  }

  abstract uploadStream(
    stream: Readable,
    options?: StorageUploadOptions,
    preloadedBuffer?: Buffer,
  ): Promise<StorageUploadResult>;

  abstract delete(key: string, options?: Record<string, unknown>): Promise<StorageDeleteResult>;
  abstract getUrl(key: string, options?: StorageUrlOptions): string;
  abstract exists(key: string): Promise<boolean>;

  protected calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  protected sanitizeKey(filename?: string, folder?: string, publicId?: string): string {
    if (publicId) return publicId.replace(/^\/+|\/+$/g, '');
    const cleanFolder = folder ? folder.replace(/^\/+|\/+$/g, '') : '';
    const cleanFilename = filename
      ? filename.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
      : `file_${Date.now()}`;
    return cleanFolder ? `${cleanFolder}/${cleanFilename}` : cleanFilename;
  }

  protected inferMimeType(filename?: string): string {
    if (!filename) return 'application/octet-stream';
    const ext = extname(filename).toLowerCase();
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.txt': 'text/plain',
    };
    return map[ext] || 'application/octet-stream';
  }
}
