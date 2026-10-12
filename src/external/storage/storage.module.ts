import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StorageModuleOptions } from './storage.types';
import { CloudinaryDriver } from './drivers/cloudinary.driver';
import { LocalDriver } from './drivers/local.driver';
import { STORAGE_OPTIONS, StorageFactory } from './storage.factory';
import { StorageService } from './storage.service';
import { BufferAdapter } from './adapters/buffer.adapter';
import { Base64Adapter } from './adapters/base64.adapter';
import { UploadAdapterResolver } from './adapters/adapter.resolver';
import { FileSizeValidator } from './validators/file-size.validator';
import { MimeTypeValidator } from './validators/mime-type.validator';
import { CompositeFileValidator } from './validators/composite.validator';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    BufferAdapter,
    Base64Adapter,
    UploadAdapterResolver,
    FileSizeValidator,
    MimeTypeValidator,
    CompositeFileValidator,
    {
      provide: STORAGE_OPTIONS,
      useFactory: (config: ConfigService): StorageModuleOptions => ({
        defaultDriver: 'cloudinary',
        cloudinary: {
          cloudName: config.get<string>('CLOUDINARY_CLOUD_NAME') || '',
          apiKey: config.get<string>('CLOUDINARY_API_KEY') || '',
          apiSecret: config.get<string>('CLOUDINARY_API_SECRET') || '',
          defaultFolder: 'uploads',
          secure: true,
        },
        local: {
          uploadDir: config.get<string>('LOCAL_UPLOAD_DIR') || './uploads',
          baseUrl: config.get<string>('LOCAL_STORAGE_BASE_URL') || 'http://localhost:6543/uploads',
        },
      }),
      inject: [ConfigService],
    },
    {
      provide: StorageFactory,
      useFactory: (options: StorageModuleOptions) => {
        const factory = new StorageFactory(options);
        factory.register(
          new CloudinaryDriver({
            cloudName: options.cloudinary?.cloudName || '',
            apiKey: options.cloudinary?.apiKey || '',
            apiSecret: options.cloudinary?.apiSecret || '',
            defaultFolder: options.cloudinary?.defaultFolder || 'uploads',
            secure: options.cloudinary?.secure ?? true,
          }),
        );
        factory.register(
          new LocalDriver({
            uploadDir: options.local?.uploadDir || './uploads',
            baseUrl: options.local?.baseUrl || 'http://localhost:6543/uploads',
          }),
        );
        return factory;
      },
      inject: [STORAGE_OPTIONS],
    },
    StorageService,
  ],
  exports: [
    StorageFactory,
    StorageService,
    BufferAdapter,
    Base64Adapter,
    UploadAdapterResolver,
    FileSizeValidator,
    MimeTypeValidator,
    CompositeFileValidator,
    STORAGE_OPTIONS,
  ],
})
export class StorageModule {}
