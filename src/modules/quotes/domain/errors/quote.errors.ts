import { DomainError } from '@/common/types/domain.error';

export class QuoteNotFoundError extends DomainError {
  constructor(id: string) {
    super();
    this.message = `Quote with ID ${id} not found`;
  }
  readonly code = 'QUOTE_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
}
