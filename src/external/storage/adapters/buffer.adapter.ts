import { BadRequestException, Injectable } from '@nestjs/common';
import type { IUploadAdapter, NormalizedUpload } from './adapter.interface';
import type { StorageMulterFile, StorageUploadOptions } from '../storage.types';

export type BufferInputType =
  | Buffer
  | StorageMulterFile
  | {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    };

/**
 * GoF Adapter: Buffer Upload Adapter (Default)
 * Handles raw Buffer, Express Multer files, and objects wrapping a buffer.
 */
@Injectable()
export class BufferAdapter implements IUploadAdapter<BufferInputType> {
  readonly type = 'buffer';

  supports(input: unknown): input is BufferInputType {
    if (!input) return false;
    if (Buffer.isBuffer(input)) return true;
    if (
      typeof input === 'object' &&
      'buffer' in input &&
      Buffer.isBuffer((input as { buffer?: unknown }).buffer)
    ) {
      return true;
    }
    return false;
  }

  adapt(input: BufferInputType, options?: StorageUploadOptions): NormalizedUpload {
    if (Buffer.isBuffer(input)) {
      return {
        buffer: input,
        size: input.length,
        originalFilename: options?.filename,
        mimeType: options?.mimeType,
      };
    }

    if (typeof input === 'object' && 'buffer' in input && Buffer.isBuffer(input.buffer)) {
      const multer = input as StorageMulterFile;
      return {
        buffer: multer.buffer,
        size: multer.size ?? multer.buffer.length,
        originalFilename: options?.filename || multer.originalname,
        mimeType: options?.mimeType || multer.mimetype,
      };
    }

    throw new BadRequestException('Invalid buffer payload provided');
  }
}
