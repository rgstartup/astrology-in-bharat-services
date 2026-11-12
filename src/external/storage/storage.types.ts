import type { Readable } from 'node:stream';

export type StorageDriverType = 'cloudinary' | 'local';
export type StorageResourceType = 'auto' | 'image' | 'video' | 'raw';

export interface StorageMulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  destination?: string;
  filename?: string;
  path?: string;
}

export type StorageFileInput =
  | Buffer
  | string
  | StorageMulterFile
  | Readable
  | {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    };

export interface StorageUploadOptions {
  folder?: string;
  filename?: string;
  publicId?: string;
  mimeType?: string;
  resourceType?: StorageResourceType;
  overwrite?: boolean;
  invalidate?: boolean;
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
  /** Maximum allowable file size in bytes */
  maxSizeBytes?: number;
  /** Minimum allowable file size in bytes */
  minSizeBytes?: number;
  /** Explicit whitelist of allowed MIME types (e.g. ['image/jpeg', 'image/png']) */
  allowedMimeTypes?: string[];
  /** Whitelist of allowed MIME type prefixes (e.g. ['image/', 'video/']) */
  allowedPrefixes?: string[];
  providerOptions?: Record<string, unknown>;
}

export interface StorageUploadResult {
  url: string;
  secureUrl: string;
  key: string;
  size: number;
  mimeType: string;
  originalFilename?: string;
  format?: string;
  checksum?: string;
  provider: StorageDriverType;
  metadata?: Record<string, unknown>;
  raw?: unknown;
}

export interface StorageDeleteResult {
  success: boolean;
  key: string;
  provider: StorageDriverType;
  raw?: unknown;
}

export interface StorageUrlOptions {
  width?: number;
  height?: number;
  quality?: number | 'auto';
  format?: string;
  crop?: string;
  transformation?: string;
  /** Generate a signed delivery URL (Cloudinary `sign_url: true`) */
  signed?: boolean;
}

export interface CloudinaryDriverConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  defaultFolder?: string;
  secure?: boolean;
}

export interface LocalDriverConfig {
  uploadDir: string;
  baseUrl: string;
}

export interface StorageModuleOptions {
  defaultDriver?: StorageDriverType;
  cloudinary?: Partial<CloudinaryDriverConfig>;
  local?: Partial<LocalDriverConfig>;
}

/**
 * GoF Strategy: Common Driver Interface
 */
export interface SignedUploadParams {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: string;
  uploadUrl: string;
  /** Maximum allowable file size in bytes (for client-side pre-validation) */
  maxSizeBytes?: number;
  /** Allowed MIME types (for client-side pre-validation) */
  allowedMimeTypes?: string[];
}

export interface VerifiedUpload {
  publicId: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resourceType?: string;
}

export interface SignedUploadOptions {
  folder?: string;
  resourceType?: string;
}

export interface VerifyUploadOptions {
  folder?: string;
  resourceType?: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export interface IStorageDriver {
  readonly name: StorageDriverType;
  upload(file: StorageFileInput, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  uploadStream(stream: Readable, options?: StorageUploadOptions, preloadedBuffer?: Buffer): Promise<StorageUploadResult>;
  delete(key: string, options?: Record<string, unknown>): Promise<StorageDeleteResult>;
  getUrl(key: string, options?: StorageUrlOptions): string;
  exists(key: string): Promise<boolean>;
  /** Cloudinary-only: return signature params so the client can upload directly to Cloudinary */
  getSignedUploadParams?(options?: SignedUploadOptions): Promise<SignedUploadParams>;
  /** Cloudinary-only: re-fetch the asset from Cloudinary and validate constraints before persisting */
  verifyUpload?(publicId: string, options?: VerifyUploadOptions): Promise<VerifiedUpload>;
}
