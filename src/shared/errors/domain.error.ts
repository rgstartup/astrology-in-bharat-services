import { HttpStatus } from '@nestjs/common';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly message: string;
  readonly httpStatus: number = HttpStatus.BAD_REQUEST;
  readonly fieldErrors?: Record<string, string[]>;
}
