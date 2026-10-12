import { BadRequestException, Injectable } from '@nestjs/common';
import type { IUploadAdapter, NormalizedUpload } from './adapter.interface';
import type { StorageUploadOptions } from '../storage.types';

/**
 * GoF Adapter: Base64 Upload Adapter
 * Handles Data URIs (`data:image/png;base64,...`) and raw Base64 strings.
 */
@Injectable()
export class Base64Adapter implements IUploadAdapter<string> {
  readonly type = 'base64';
  private static readonly DATA_URI_REGEX = /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/s;
  private static readonly BASE64_CHARS_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

  supports(input: unknown): input is string {
    if (typeof input !== 'string' || !input.trim()) return false;
    const trimmed = input.trim();
    if (Base64Adapter.DATA_URI_REGEX.test(trimmed)) return true;
    if (trimmed.length >= 8 && trimmed.length % 4 === 0) {
      return Base64Adapter.BASE64_CHARS_REGEX.test(trimmed.replace(/\s+/g, ''));
    }
    return false;
  }

  adapt(input: string, options?: StorageUploadOptions): NormalizedUpload {
    if (!input || typeof input !== 'string') {
      throw new BadRequestException('No base64 string provided');
    }

    const trimmed = input.trim();
    const match = trimmed.match(Base64Adapter.DATA_URI_REGEX);
    let rawData = trimmed;
    let detectedMime: string | undefined;

    if (match && match[1] && match[2]) {
      detectedMime = match[1];
      rawData = match[2].replace(/\s+/g, '');
    } else {
      rawData = trimmed.replace(/\s+/g, '');
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(rawData, 'base64');
    } catch (err) {
      throw new BadRequestException(`Failed to decode base64: ${(err as Error).message}`);
    }

    if (buffer.length === 0) {
      throw new BadRequestException('Decoded base64 buffer is empty');
    }

    const mimeType = options?.mimeType || detectedMime;
    const format = mimeType ? mimeType.split('/')[1]?.replace('+xml', '') : undefined;
    const originalFilename =
      options?.filename || (format ? `upload_${Date.now()}.${format}` : undefined);

    return {
      buffer,
      size: buffer.length,
      mimeType,
      format,
      originalFilename,
    };
  }
}
