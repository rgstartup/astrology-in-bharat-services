import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import type { IUploadAdapter, NormalizedUpload } from './adapter.interface';
import type { StorageUploadOptions } from '../storage.types';
import { BufferAdapter } from './buffer.adapter';
import { Base64Adapter } from './base64.adapter';

/**
 * GoF Adapter Resolver / Composite
 * Manages registered adapters and resolves the appropriate adapter for any upload input.
 */
@Injectable()
export class UploadAdapterResolver {
  private readonly adapters: IUploadAdapter[] = [];
  private readonly defaultAdapter: BufferAdapter;

  constructor(
    @Optional() bufferAdapter?: BufferAdapter,
    @Optional() base64Adapter?: Base64Adapter,
  ) {
    this.defaultAdapter = bufferAdapter || new BufferAdapter();
    const b64 = base64Adapter || new Base64Adapter();

    this.register(this.defaultAdapter);
    this.register(b64);
  }

  register(adapter: IUploadAdapter): this {
    this.adapters.unshift(adapter);
    return this;
  }

  resolve(input: unknown): IUploadAdapter {
    for (const adapter of this.adapters) {
      if (adapter.supports(input)) return adapter;
    }
    return this.defaultAdapter;
  }

  adapt(input: unknown, options?: StorageUploadOptions): NormalizedUpload {
    if (!input) {
      throw new BadRequestException('File is required for upload');
    }
    return this.resolve(input).adapt(input, options);
  }
}
