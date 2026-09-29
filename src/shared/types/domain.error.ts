export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly message: string;
  abstract readonly httpStatus: number;
}
