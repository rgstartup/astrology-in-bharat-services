import { describe, expect, it } from 'vitest';
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
});
