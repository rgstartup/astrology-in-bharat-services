import { BeforeInsert, PrimaryGeneratedColumn } from "typeorm";
import { uuidv7 } from "uuidv7";

export function UuidV7PrimaryKey() {
  return function (target: any, propertyKey: string) {
    // 1. Apply @PrimaryGeneratedColumn('uuid') on the property
    PrimaryGeneratedColumn('uuid')(target, propertyKey);

    // 2. Inject a @BeforeInsert method dynamically onto the prototype
    const methodKey = '__generateUuidV7__';

    target[methodKey] = function () {
      if (!this[propertyKey]) {
        this[propertyKey] = uuidv7();
      }
    };

    // 3. BeforeInsert only takes (target, propertyKey) — no descriptor
    BeforeInsert()(target, methodKey);
  };
}