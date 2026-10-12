# File Storage Service Architecture & Integration Guide

This document describes the design, architecture patterns, and integration methods for the Abstract File Storage Service located at `backend/src/external/storage/`.

Interactive architecture diagram: [storage-service-architecture.html](../.archify/architecture-storage-service-20261008-143000/storage-service-architecture.html)

---

## 1. Architectural Overview & GoF Design Patterns

The File Storage Service is built with strict Gang of Four (GoF) design patterns to ensure decoupling, extensibility, and testability.

```
                  ┌──────────────────────────────┐
                  │    Controllers / Use Cases   │
                  └──────────────┬───────────────┘
                                 │
                     upload / uploadBase64 / disk()
                                 ▼
                  ┌──────────────────────────────┐
                  │    StorageService (Facade)   │
                  └──────┬───────────────┬───────┘
                         │               │
                 resolve driver          │
                         ▼               │
                  ┌──────────────┐       │
                  │StorageFactory│       │
                  │  (Factory)   │       │
                  └──────┬───────┘       │
                         │               │
       ┌─────────────────┴───────────────┴─────────────────┐
       ▼                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│             AbstractStorageDriver (Template Method)         │
│  1. Adapt Payload via UploadAdapterResolver (Adapters)      │
│  2. Validate via CompositeFileValidator (Validators)        │
│  3. Calculate Checksum (SHA-256)                            │
│  4. Sanitize Storage Key & Detect MIME                      │
│  5. Delegate to Concrete Driver uploadStream()              │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        ▼                                 ▼
┌───────────────────────┐       ┌───────────────────────┐
│CloudinaryDriver (GoF) │       │ LocalDriver (GoF)     │
│Strategy & Adapter     │       │ Strategy (Filesystem) │
└───────────┬───────────┘       └───────────┬───────────┘
            │                               │
            ▼                               ▼
   Cloudinary Cloud CDN             Local Disk (./uploads)
```

### Pattern Breakdown

| Pattern | Component | Responsibility |
|---|---|---|
| **Facade** | `StorageService` | High-level developer interface (`upload`, `uploadImage`, `uploadVideo`, `uploadDocument`, `uploadBase64`, `delete`, `getUrl`, `disk()`). |
| **Factory** | `StorageFactory` | Dynamic registry and runtime resolution of storage drivers (`cloudinary`, `local`). |
| **Strategy** | `IStorageDriver` | Standardized transport contract implemented by `CloudinaryDriver` and `LocalDriver`. |
| **Template Method** | `AbstractStorageDriver` | Standard lifecycle executing payload adaptation, pre-upload validation, checksum generation, and delegating to subclass `uploadStream()`. |
| **Adapter** | `BufferAdapter`, `Base64Adapter` | Adapts heterogeneous inputs (raw Buffers, Multer files, Base64 strings, Data URIs) into normalized `NormalizedUpload`. |
| **Composite / Spec** | `CompositeFileValidator` | Executes `FileSizeValidator` and `MimeTypeValidator` in-memory before network or disk transport. |

---

## 2. Directory Structure

```
backend/src/external/storage/
├── storage.types.ts             # IStorageDriver contract, options, and shared types
├── storage.factory.ts           # GoF Factory: Driver registry and dynamic resolution
├── storage.service.ts           # GoF Facade: upload, uploadBase64, uploadImage, etc.
├── storage.module.ts            # Global NestJS module with DI
├── index.ts                     # Explicit named exports (no wildcard barrels)
├── adapters/
│   ├── adapter.interface.ts     # IUploadAdapter contract & NormalizedUpload
│   ├── buffer.adapter.ts        # BufferAdapter (Default strategy for Buffer / Multer)
│   ├── base64.adapter.ts        # Base64Adapter (Data URIs and raw base64)
│   └── adapter.resolver.ts      # UploadAdapterResolver (Composite resolver)
├── validators/
│   ├── validator.interface.ts   # IFileValidator contract
│   ├── file-size.validator.ts   # FileSizeValidator (min/max size checks)
│   ├── mime-type.validator.ts   # MimeTypeValidator (whitelist, prefix & resource-type checks)
│   └── composite.validator.ts   # CompositeFileValidator (GoF Composite execution chain)
├── drivers/
│   ├── abstract.driver.ts       # GoF Template Method: Checksums, sanitization, MIME inference
│   ├── cloudinary.driver.ts     # Standalone Cloudinary driver
│   └── local.driver.ts          # Local filesystem driver
└── tests/
    └── storage.spec.ts          # Vitest unit test suite
```

---

## 3. How to Implement & Use in the Application

### Step 1: Import `StorageModule`

`StorageModule` is decorated with `@Global()`. When imported into `ExternalModule` or `AppModule`, its services and factories are available across all feature modules.

```typescript
// app.module.ts or feature.module.ts
import { Module } from '@nestjs/common';
import { StorageModule } from '@/external/storage';

@Module({
  imports: [StorageModule],
})
export class FeatureModule {}
```

---

### Step 2: Inject `StorageService`

Inject `StorageService` into your NestJS use case or controller:

```typescript
import { Injectable } from '@nestjs/common';
import { StorageService } from '@/external/storage';

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(private readonly storageService: StorageService) {}

  async execute(file: Express.Multer.File, userId: number) {
    // Standard image upload (auto-enforces resourceType: 'image' and default folder 'images')
    const result = await this.storageService.uploadImage(file, {
      folder: 'avatars',
      filename: `user_${userId}.jpg`,
      maxSizeBytes: 5 * 1024 * 1024, // 5MB limit
    });

    return {
      avatarUrl: result.secureUrl,
      publicId: result.key,
      checksum: result.checksum,
    };
  }
}
```

---

### Step 3: Base64 / Canvas / Mobile Uploads

For client apps sending Base64 strings or Data URIs:

```typescript
const result = await this.storageService.uploadBase64(base64String, {
  folder: 'signatures',
  filename: 'client_signature.png',
  allowedMimeTypes: ['image/png', 'image/jpeg'],
});
```

---

### Step 4: Multi-Disk & Local Testing

Switch target disk dynamically per call via `.disk()`:

```typescript
// Upload to local disk for temp/export processing
const localResult = await this.storageService.disk('local').upload(buffer, {
  folder: 'temp_reports',
  filename: 'report.pdf',
});

// Upload to Cloudinary explicitly
const cloudResult = await this.storageService.disk('cloudinary').upload(buffer, {
  folder: 'marketing',
});
```

---

### Step 5: Transformations & URL Generation

```typescript
const optimizedThumbnailUrl = this.storageService.getUrl('avatars/user_123.jpg', {
  width: 300,
  height: 300,
  crop: 'fill',
  quality: 'auto',
  format: 'webp',
});
```

---

## 4. Error Handling & Validation Rules

- **`PayloadTooLargeException` (HTTP 413)**: Thrown automatically if `file.size > maxSizeBytes` or default 50MB ceiling.
- **`UnsupportedMediaTypeException` (HTTP 415)**: Thrown automatically if MIME does not match `allowedMimeTypes`, `allowedPrefixes`, or `resourceType`.
- **`BadRequestException` (HTTP 400)**: Thrown if input buffer or base64 string is corrupt/empty.
