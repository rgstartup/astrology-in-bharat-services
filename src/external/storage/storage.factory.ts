import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { IStorageDriver, StorageDriverType, StorageModuleOptions } from './storage.types';

export const STORAGE_OPTIONS = Symbol('STORAGE_OPTIONS');

/**
 * GoF Factory: Storage Driver Factory
 */
@Injectable()
export class StorageFactory {
  private readonly drivers = new Map<StorageDriverType, IStorageDriver>();
  private readonly defaultType: StorageDriverType;

  constructor(
    @Optional()
    @Inject(STORAGE_OPTIONS)
    options?: StorageModuleOptions,
  ) {
    this.defaultType = options?.defaultDriver || 'cloudinary';
  }

  register(driver: IStorageDriver): this {
    this.drivers.set(driver.name, driver);
    return this;
  }

  getDriver(type?: StorageDriverType): IStorageDriver {
    const target = type || this.defaultType;
    const driver = this.drivers.get(target);
    if (!driver) {
      throw new NotFoundException(`Storage driver '${target}' not found`);
    }
    return driver;
  }

  getDefaultDriver(): IStorageDriver {
    return this.getDriver(this.defaultType);
  }
}
