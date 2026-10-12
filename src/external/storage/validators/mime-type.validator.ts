import {
  Inject,
  Injectable,
  Optional,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { IFileValidator } from './validator.interface';
import type { NormalizedUpload } from '../adapters/adapter.interface';
import type { StorageUploadOptions } from '../storage.types';

export const MIME_TYPE_VALIDATOR_OPTIONS = 'MIME_TYPE_VALIDATOR_OPTIONS';

export interface MimeTypeValidatorOptions {
  /** Explicit whitelist of allowed MIME types (e.g. ['image/jpeg', 'image/png']) */
  allowedMimeTypes?: string[];
  /** Whitelist of allowed MIME type prefixes (e.g. ['image/', 'video/']) */
  allowedPrefixes?: string[];
}

/**
 * GoF Strategy: MIME Type Validator
 *
 * Enforces MIME type whitelisting and resource-type constraints (image/*, video/*).
 */
@Injectable()
export class MimeTypeValidator implements IFileValidator {
  readonly name = 'mime-type';

  constructor(
    @Optional()
    @Inject(MIME_TYPE_VALIDATOR_OPTIONS)
    private readonly defaultOptions?: MimeTypeValidatorOptions,
  ) {}

  validate(
    file: NormalizedUpload,
    options?: StorageUploadOptions & MimeTypeValidatorOptions,
  ): void {
    const fileMime = file.mimeType?.toLowerCase();
    if (!fileMime) {
      return; // If MIME is undetectable and no strict rules provided, defer to driver inference
    }

    const allowedMimes =
      options?.allowedMimeTypes ?? this.defaultOptions?.allowedMimeTypes;
    const allowedPrefixes =
      options?.allowedPrefixes ?? this.defaultOptions?.allowedPrefixes;

    // 1. Explicit allowed MIME types check
    if (allowedMimes && allowedMimes.length > 0) {
      const isAllowed = allowedMimes.some(
        (allowed) =>
          allowed.toLowerCase() === fileMime ||
          fileMime.startsWith(allowed.toLowerCase()),
      );
      if (!isAllowed) {
        throw new UnsupportedMediaTypeException(
          `Unsupported MIME type '${file.mimeType}'. Allowed types: [${allowedMimes.join(', ')}]`,
        );
      }
    }

    // 2. Allowed prefixes check
    if (allowedPrefixes && allowedPrefixes.length > 0) {
      const matchesPrefix = allowedPrefixes.some((prefix) =>
        fileMime.startsWith(prefix.toLowerCase()),
      );
      if (!matchesPrefix) {
        throw new UnsupportedMediaTypeException(
          `MIME type '${file.mimeType}' does not match required prefixes: [${allowedPrefixes.join(', ')}]`,
        );
      }
    }

    // 3. ResourceType consistency check if options.resourceType is specific
    if (options?.resourceType === 'image' && !fileMime.startsWith('image/')) {
      throw new UnsupportedMediaTypeException(
        `Expected an image file, but received MIME type '${file.mimeType}'`,
      );
    }

    if (options?.resourceType === 'video' && !fileMime.startsWith('video/')) {
      throw new UnsupportedMediaTypeException(
        `Expected a video file, but received MIME type '${file.mimeType}'`,
      );
    }
  }
}
