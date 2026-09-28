import {
  ClassConstructor,
  ClassTransformOptions,
  plainToInstance,
} from 'class-transformer';

export class DtoTransformer {
  /**
   * Transforms a plain object/entity into a typed class instance using class-transformer
   */
  static transform<T, V>(
    cls: ClassConstructor<T>,
    plain: V,
    options?: ClassTransformOptions,
  ): T {
    return plainToInstance(cls, plain, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      ...options,
    });
  }

  /**
   * Transforms an array of plain objects/entities into an array of typed class instances
   */
  static transformArray<T, V>(
    cls: ClassConstructor<T>,
    plainArray: V[],
    options?: ClassTransformOptions,
  ): T[] {
    return plainToInstance(cls, plainArray, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      ...options,
    });
  }
}
