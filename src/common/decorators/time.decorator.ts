// is-timestamptz.decorator.ts
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

// matches: 2024-01-01T00:00:00Z  or  2024-01-01T00:00:00+05:30
const TIMESTAMPTZ_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

export function IsTimestampTz(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isTimestampTz',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return typeof value === 'string' && TIMESTAMPTZ_REGEX.test(value);
        },
        defaultMessage() {
          return `${propertyName} must be a valid timestamptz ISO string (e.g. 2024-01-01T00:00:00Z or 2024-01-01T00:00:00+05:30)`;
        },
      },
    });
  };
}


// is-after.decorator.ts
export function IsAfter(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isAfter',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          if (!value || !relatedValue) return true; // let other validators handle missing
          return new Date(value) >= new Date(relatedValue);
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          return `${args.property} must be after or equal to ${relatedPropertyName}`;
        },
      },
    });
  };
}