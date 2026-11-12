import { describe, expect, it, vi } from 'vitest';
import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import { PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { BufferAdapter } from '../adapters/buffer.adapter';
import { Base64Adapter } from '../adapters/base64.adapter';
import { UploadAdapterResolver } from '../adapters/adapter.resolver';
import { StorageFactory } from '../storage.factory';
import { StorageService } from '../storage.service';
import { LocalDriver } from '../drivers/local.driver';
import { CloudinaryDriver } from '../drivers/cloudinary.driver';
import { FileSizeValidator } from '../validators/file-size.validator';
import { MimeTypeValidator } from '../validators/mime-type.validator';
import { CompositeFileValidator } from '../validators/composite.validator';

vi.mock('cloudinary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('cloudinary')>();
  return {
    ...actual,
    v2: {
      ...actual.v2,
      api: {
        ...actual.v2.api,
        resource: vi.fn(),
      },
    },
  };
});

describe('Storage Module (GoF Simplified Architecture)', () => {
  const testDir = join(process.cwd(), 'tmp-storage-test');
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  describe('Upload Adapters (GoF Adapter Pattern)', () => {
    const bufferAdapter = new BufferAdapter();
    const base64Adapter = new Base64Adapter();
    const resolver = new UploadAdapterResolver(bufferAdapter, base64Adapter);

    it('should adapt raw Buffer (Default Strategy)', () => {
      const buffer = Buffer.from('hello buffer');
      const res = bufferAdapter.adapt(buffer, { filename: 'file.txt', mimeType: 'text/plain' });
      expect(res.buffer).toEqual(buffer);
      expect(res.size).toBe(12);
      expect(res.originalFilename).toBe('file.txt');
    });

    it('should adapt Base64 Data URI', () => {
      const dataUri = `data:image/png;base64,${pngBase64}`;
      const res = base64Adapter.adapt(dataUri);
      expect(res.mimeType).toBe('image/png');
      expect(res.format).toBe('png');
      expect(res.size).toBeGreaterThan(0);
      expect(res.buffer).toBeInstanceOf(Buffer);
    });

    it('should adapt raw Base64 string', () => {
      const res = base64Adapter.adapt(pngBase64, { filename: 'raw.png', mimeType: 'image/png' });
      expect(res.originalFilename).toBe('raw.png');
      expect(res.mimeType).toBe('image/png');
    });

    it('should resolve and adapt automatically via resolver', () => {
      const buf = Buffer.from('test');
      expect(resolver.adapt(buf).size).toBe(4);

      const b64 = `data:image/png;base64,${pngBase64}`;
      expect(resolver.adapt(b64).mimeType).toBe('image/png');
    });
  });

  describe('File Validators (GoF Strategy & Composite Pattern)', () => {
    const sizeValidator = new FileSizeValidator({ maxSizeBytes: 100 });
    const mimeValidator = new MimeTypeValidator();
    const compositeValidator = new CompositeFileValidator([sizeValidator, mimeValidator]);

    it('should pass validation for valid size and MIME', () => {
      expect(() =>
        sizeValidator.validate({
          buffer: Buffer.from('short'),
          size: 5,
          mimeType: 'text/plain',
        }),
      ).not.toThrow();
    });

    it('should throw PayloadTooLargeException when size exceeds limit', () => {
      expect(() =>
        sizeValidator.validate(
          {
            buffer: Buffer.alloc(200),
            size: 200,
            mimeType: 'text/plain',
          },
          { maxSizeBytes: 100 },
        ),
      ).toThrow(PayloadTooLargeException);
    });

    it('should throw UnsupportedMediaTypeException when MIME not in whitelist', () => {
      expect(() =>
        mimeValidator.validate(
          {
            buffer: Buffer.from('data'),
            size: 4,
            mimeType: 'application/x-bad',
          },
          { allowedMimeTypes: ['image/jpeg', 'image/png'] },
        ),
      ).toThrow(UnsupportedMediaTypeException);
    });

    it('should enforce resourceType constraints (image vs non-image)', () => {
      expect(() =>
        mimeValidator.validate(
          {
            buffer: Buffer.from('data'),
            size: 4,
            mimeType: 'application/pdf',
          },
          { resourceType: 'image' },
        ),
      ).toThrow(UnsupportedMediaTypeException);
    });

    it('should execute composite validator chain', () => {
      expect(() =>
        compositeValidator.validate({
          buffer: Buffer.from('ok'),
          size: 2,
          mimeType: 'image/png',
        }),
      ).not.toThrow();
    });
  });

  describe('StorageFactory & Drivers (GoF Factory & Strategy)', () => {
    const local = new LocalDriver({ uploadDir: testDir, baseUrl: 'http://loc/uploads' });
    const cloudinary = new CloudinaryDriver({ cloudName: 'c', apiKey: 'k', apiSecret: 's' });
    const factory = new StorageFactory({ defaultDriver: 'local' });
    factory.register(local).register(cloudinary);

    it('should resolve registered drivers', () => {
      expect(factory.getDefaultDriver()).toBe(local);
      expect(factory.getDriver('cloudinary')).toBe(cloudinary);
    });

    it('should upload buffer and base64 with LocalDriver and pass validation', async () => {
      const bufferResult = await local.upload(Buffer.from('test data'), { filename: 'doc.txt' });
      expect(bufferResult.provider).toBe('local');
      expect(bufferResult.key).toBe('doc.txt');
      expect(bufferResult.checksum).toBeDefined();

      const base64Result = await local.upload(`data:image/png;base64,${pngBase64}`, {
        folder: 'avatars',
        filename: 'avatar.png',
      });
      expect(base64Result.key).toBe('avatars/avatar.png');
      expect(base64Result.mimeType).toBe('image/png');

      expect(await local.exists('avatars/avatar.png')).toBe(true);
      await local.delete('avatars/avatar.png');
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('should fail upload when size limit is exceeded on driver upload', async () => {
      await expect(
        local.upload(Buffer.alloc(500), {
          filename: 'large.bin',
          maxSizeBytes: 100,
        }),
      ).rejects.toThrow(PayloadTooLargeException);
    });
  });

  describe('StorageService (GoF Facade)', () => {
    const local = new LocalDriver({ uploadDir: testDir, baseUrl: 'http://loc/uploads' });
    const cloudinary = new CloudinaryDriver({ cloudName: 'c', apiKey: 'k', apiSecret: 's' });
    const factory = new StorageFactory({ defaultDriver: 'local' });
    factory.register(local).register(cloudinary);
    const service = new StorageService(factory);

    it('should upload image, video, document, and base64 via facade', async () => {
      const img = await service.uploadImage(Buffer.from('IMG'), { filename: 'pic.jpg' });
      expect(img.key).toBe('images/pic.jpg');

      const b64 = await service.uploadBase64(`data:image/png;base64,${pngBase64}`, {
        filename: 'pic.png',
      });
      expect(b64.key).toBe('pic.png');

      const doc = await service.uploadDocument(Buffer.from('PDF'), { filename: 'doc.pdf' });
      expect(doc.key).toBe('documents/doc.pdf');

      expect(service.disk('cloudinary').name).toBe('cloudinary');
      expect(service.getUrl('images/pic.jpg')).toBe('http://loc/uploads/images/pic.jpg');

      await fs.rm(testDir, { recursive: true, force: true });
    });
  });

  describe('Cloudinary Signed Upload (direct client-to-Cloudinary)', () => {
    const cloudinary = new CloudinaryDriver({
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });

    it('getSignedUploadParams returns signature and upload URL', async () => {
      const params = await cloudinary.getSignedUploadParams({
        folder: 'avatars',
        resourceType: 'image',
      });

      expect(params.apiKey).toBe('test-key');
      expect(params.cloudName).toBe('test-cloud');
      expect(params.folder).toBe('avatars');
      expect(params.resourceType).toBe('image');
      expect(params.uploadUrl).toBe(
        'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      );
      expect(typeof params.signature).toBe('string');
      expect(params.signature.length).toBeGreaterThan(0);
      expect(typeof params.timestamp).toBe('number');
    });

    it('getSignedUploadParams uses defaults when options omitted', async () => {
      const params = await cloudinary.getSignedUploadParams();

      expect(params.folder).toBe('uploads');
      expect(params.resourceType).toBe('image');
      expect(params.uploadUrl).toBe(
        'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
      );
    });

    it('verifyUpload validates asset from Cloudinary', async () => {
      const { v2 } = await import('cloudinary');
      vi.mocked(v2.api.resource).mockResolvedValue({
        public_id: 'avatars/abc123',
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/avatars/abc123.jpg',
        width: 800,
        height: 800,
        format: 'jpg',
        bytes: 245760,
        resource_type: 'image',
      });

      const result = await cloudinary.verifyUpload('avatars/abc123', {
        folder: 'avatars',
        resourceType: 'image',
        maxSizeBytes: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      });

      expect(v2.api.resource).toHaveBeenCalledWith('avatars/abc123', {
        resource_type: 'image',
      });
      expect(result.publicId).toBe('avatars/abc123');
      expect(result.secureUrl).toContain('res.cloudinary.com');
      expect(result.bytes).toBe(245760);
    });

    it('verifyUpload rejects asset outside signed folder', async () => {
      const { v2 } = await import('cloudinary');
      vi.mocked(v2.api.resource).mockResolvedValue({
        public_id: 'other-folder/abc123',
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/other-folder/abc123.jpg',
        format: 'jpg',
        bytes: 1000,
        resource_type: 'image',
      });

      await expect(
        cloudinary.verifyUpload('other-folder/abc123', {
          folder: 'avatars',
          resourceType: 'image',
        }),
      ).rejects.toThrow('Asset was uploaded outside the signed folder');
    });

    it('verifyUpload rejects oversized file', async () => {
      const { v2 } = await import('cloudinary');
      vi.mocked(v2.api.resource).mockResolvedValue({
        public_id: 'avatars/big.jpg',
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/avatars/big.jpg',
        format: 'jpg',
        bytes: 10 * 1024 * 1024,
        resource_type: 'image',
      });

      await expect(
        cloudinary.verifyUpload('avatars/big.jpg', {
          folder: 'avatars',
          resourceType: 'image',
          maxSizeBytes: 5 * 1024 * 1024,
        }),
      ).rejects.toThrow('File exceeds maximum allowed size');
    });

    it('verifyUpload rejects disallowed mime type', async () => {
      const { v2 } = await import('cloudinary');
      vi.mocked(v2.api.resource).mockResolvedValue({
        public_id: 'avatars/doc.pdf',
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/avatars/doc.pdf',
        format: 'pdf',
        bytes: 1000,
        resource_type: 'image',
      });

      await expect(
        cloudinary.verifyUpload('avatars/doc.pdf', {
          folder: 'avatars',
          resourceType: 'image',
          allowedMimeTypes: ['image/jpeg', 'image/png'],
        }),
      ).rejects.toThrow('File type image/pdf is not allowed');
    });

    it('StorageService exposes getSignedUploadParams and verifyUpload', async () => {
      const factory = new StorageFactory({ defaultDriver: 'cloudinary' });
      factory.register(cloudinary);
      const service = new StorageService(factory);

      const params = await service.getSignedUploadParams({ folder: 'avatars' });
      expect(params.apiKey).toBe('test-key');

      const { v2 } = await import('cloudinary');
      vi.mocked(v2.api.resource).mockResolvedValue({
        public_id: 'avatars/abc123',
        secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/avatars/abc123.jpg',
        format: 'jpg',
        bytes: 1000,
        resource_type: 'image',
      });

      const verified = await service.verifyUpload('avatars/abc123', {
        folder: 'avatars',
      });
      expect(verified.publicId).toBe('avatars/abc123');
    });
  });
});
