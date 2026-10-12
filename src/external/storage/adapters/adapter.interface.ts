import type { StorageUploadOptions } from '../storage.types';

export interface NormalizedUpload {
  buffer: Buffer;
  size: number;
  mimeType?: string;
  originalFilename?: string;
  format?: string;
}

/**
 * GoF Adapter: Upload Input Adapter Contract
 */
export interface IUploadAdapter<T = unknown> {
  readonly type: string;
  supports(input: unknown): input is T;
  adapt(input: T, options?: StorageUploadOptions): NormalizedUpload;
}
