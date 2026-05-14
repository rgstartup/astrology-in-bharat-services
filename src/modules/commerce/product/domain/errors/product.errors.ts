import { DomainError } from '@/common/types/domain.error';

export class ProductNotFoundError extends DomainError {
  constructor(productId: number) {
    super();
    this.message = `Product with ID ${productId} not found`;
  }
  readonly code = 'PRODUCT_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
}
