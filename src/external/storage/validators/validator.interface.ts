import type { NormalizedUpload } from '../adapters/adapter.interface';
import type { StorageUploadOptions } from '../storage.types';

/**
 * GoF Strategy / Specification: File Validator Contract
 */
export interface IFileValidator {
  /** Identifier or name of the validator */
  readonly name: string;

  /**
   * Validates an adapted file payload before storage persistence.
   *
   * @param file - The normalized file payload (buffer, size, mimeType, filename)
   * @param options - Upload options containing optional limits or validation rules
   * @throws HttpException if validation fails
   */
  validate(file: NormalizedUpload, options?: StorageUploadOptions): void;
}
