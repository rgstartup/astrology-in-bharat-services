import { ValidationError } from '@nestjs/common';

export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const error of errors) {
    const propertyPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    if (error.constraints) {
      fieldErrors[propertyPath] = Object.values(error.constraints);
    }

    if (error.children && error.children.length > 0) {
      const nestedErrors = formatValidationErrors(error.children, propertyPath);
      for (const [key, messages] of Object.entries(nestedErrors)) {
        if (fieldErrors[key]) {
          fieldErrors[key].push(...messages);
        } else {
          fieldErrors[key] = messages;
        }
      }
    }
  }

  return fieldErrors;
}
