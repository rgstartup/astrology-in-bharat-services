import { promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AbstractStorageDriver } from './abstract.driver';
import type {
  LocalDriverConfig,
  StorageDeleteResult,
  StorageDriverType,
  StorageUploadOptions,
  StorageUploadResult,
  StorageUrlOptions,
} from '../storage.types';

/**
 * GoF Strategy: Local Filesystem Storage Driver
 */
@Injectable()
export class LocalDriver extends AbstractStorageDriver {
  readonly name: StorageDriverType = 'local';
  private readonly logger = new Logger(LocalDriver.name);
  private readonly config: LocalDriverConfig;

  constructor(config: LocalDriverConfig) {
    super();
    this.config = config;
  }

  async uploadStream(
    stream: Readable,
    options?: StorageUploadOptions,
    preloadedBuffer?: Buffer,
  ): Promise<StorageUploadResult> {
    const key = this.sanitizeKey(options?.filename, options?.folder, options?.publicId);
    const targetFilePath = join(this.config.uploadDir, key);
    const mimeType = options?.mimeType || this.inferMimeType(key);

    try {
      await fs.mkdir(dirname(targetFilePath), { recursive: true });

      let checksum: string | undefined;
      let size = 0;

      if (preloadedBuffer) {
        await fs.writeFile(targetFilePath, preloadedBuffer);
        checksum = this.calculateChecksum(preloadedBuffer);
        size = preloadedBuffer.length;
      } else {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        await pipeline(stream, createWriteStream(targetFilePath));
        const total = Buffer.concat(chunks);
        checksum = this.calculateChecksum(total);
        size = total.length;
      }

      const url = this.getUrl(key);

      return {
        url,
        secureUrl: url,
        key,
        size,
        mimeType,
        originalFilename: options?.filename,
        checksum,
        provider: 'local',
      };
    } catch (error) {
      this.logger.error(`Local upload failed: ${(error as Error).message}`);
      throw new InternalServerErrorException(`Local upload failed: ${(error as Error).message}`);
    }
  }

  async delete(key: string): Promise<StorageDeleteResult> {
    const targetFilePath = join(this.config.uploadDir, key);
    try {
      await fs.unlink(targetFilePath);
      return { success: true, key, provider: 'local' };
    } catch (error) {
      const isNotFound = (error as NodeJS.ErrnoException).code === 'ENOENT';
      return { success: isNotFound, key, provider: 'local', raw: isNotFound ? undefined : error };
    }
  }

  getUrl(key: string, _options?: StorageUrlOptions): string {
    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    return `${baseUrl}/${key.replace(/^\/+/, '')}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(join(this.config.uploadDir, key));
      return true;
    } catch {
      return false;
    }
  }
}
