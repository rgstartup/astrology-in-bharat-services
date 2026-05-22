import { PrimaryColumn, BeforeInsert } from 'typeorm';
import { uuidv7 } from 'uuidv7';

export function PrimaryKeyColumn(): PropertyDecorator {
  return function (target: Object, propertyName: string | symbol) {
    // Register it as a primary UUID column
    PrimaryColumn({ type: 'uuid' })(target, propertyName);

    // Register a BeforeInsert hook to auto-generate the UUIDv7 if missing
    const methodName = `_generateUuidV7_${String(propertyName)}`;
    (target as any)[methodName] = function () {
      if (!this[propertyName]) {
        this[propertyName] = uuidv7();
      }
    };
    BeforeInsert()(target, methodName);
  };
}
