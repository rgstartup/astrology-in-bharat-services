import {
  ClassConstructor,
  ClassTransformOptions,
  plainToInstance,
} from 'class-transformer';

export class BaseDto {
  /**
   * Transforms a plain object or entity into an instance of this DTO class
   */
  static from<T extends BaseDto>(
    this: ClassConstructor<T>,
    plain: object | null | undefined,
    options?: ClassTransformOptions,
  ): T {
    if (!plain) {
      return null as unknown as T;
    }

    return plainToInstance(this, plain, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      ...options,
    });
  }

  /**
   * Transforms an array of plain objects or entities into an array of DTO instances
   */
  static fromArray<T extends BaseDto>(
    this: ClassConstructor<T>,
    plainArray: object[] | null | undefined,
    options?: ClassTransformOptions,
  ): T[] {
    if (!plainArray || !Array.isArray(plainArray)) {
      return [];
    }

    return plainToInstance(this, plainArray, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      ...options,
    });
  }
}
