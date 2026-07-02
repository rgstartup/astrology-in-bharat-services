import { PrimaryColumn, BeforeInsert } from 'typeorm';
import { uuidv7 } from 'uuidv7';

export function UuidPrimaryKeyColumn(): PropertyDecorator {
  return function (target: object, propertyName: string | symbol) {
    // Register it as a primary UUID column
    PrimaryColumn({ type: 'uuid' })(target, propertyName);

    // Register a BeforeInsert hook to auto-generate the UUIDv7 if missing
    const methodName = `_generateUuidV7_${String(propertyName)}`;
    (target as Record<string, unknown>)[methodName] = function (
      this: Record<string, unknown>,
    ) {
      if (!this[propertyName as string]) {
        this[propertyName as string] = uuidv7();
      }
    };
    BeforeInsert()(target, methodName);
  };
}
