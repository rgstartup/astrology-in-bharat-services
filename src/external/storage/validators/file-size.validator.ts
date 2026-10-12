import { Inject, Injectable, Optional, PayloadTooLargeException } from '@nestjs/common';
import type { IFileValidator } from './validator.interface';
import type { NormalizedUpload } from '../adapters/adapter.interface';
import type { StorageUploadOptions } from '../storage.types';

export const FILE_SIZE_VALIDATOR_OPTIONS = 'FILE_SIZE_VALIDATOR_OPTIONS';

export interface FileSizeValidatorOptions {
  /** Maximum allowable file size in bytes */
  maxSizeBytes?: number;
  /** Minimum required file size in bytes (default: 1) */
  minSizeBytes?: number;
}

/**
 * GoF Strategy: File Size Validator
 *
 * Enforces file size boundaries (min/max bytes).
 * Default max size: 50MB (overrideable per upload or via constructor).
 */
@Injectable()
export class FileSizeValidator implements IFileValidator {
  readonly name = 'file-size';
  private static readonly DEFAULT_MAX_BYTES = 50 * 1024 * 1024; // 50MB default

  constructor(
    @Optional()
    @Inject(FILE_SIZE_VALIDATOR_OPTIONS)
    private readonly defaultOptions?: FileSizeValidatorOptions,
  ) {}

  validate(
    file: NormalizedUpload,
    options?: StorageUploadOptions & FileSizeValidatorOptions,
  ): void {
    const minBytes =
      options?.minSizeBytes ?? this.defaultOptions?.minSizeBytes ?? 1;
    const maxBytes =
      options?.maxSizeBytes ??
      this.defaultOptions?.maxSizeBytes ??
      FileSizeValidator.DEFAULT_MAX_BYTES;

    if (file.size < minBytes) {
      throw new PayloadTooLargeException(
        `File size (${file.size} bytes) is below minimum allowed size (${minBytes} bytes)`,
      );
    }

    if (file.size > maxBytes) {
      const maxMb = (maxBytes / (1024 * 1024)).toFixed(2);
      const fileMb = (file.size / (1024 * 1024)).toFixed(2);
      throw new PayloadTooLargeException(
        `File size (${fileMb}MB) exceeds maximum allowed size of ${maxMb}MB (${maxBytes} bytes)`,
      );
    }
  }
}
