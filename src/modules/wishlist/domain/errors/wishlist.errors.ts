import { DomainError } from '@/common/types/domain.error';

export class ProductAlreadyInWishlistError extends DomainError {
  readonly code = 'PRODUCT_ALREADY_IN_WISHLIST';
  readonly message = 'Product already in wishlist';
  readonly httpStatus = 409;
}

export class ExpertAlreadyInWishlistError extends DomainError {
  readonly code = 'EXPERT_ALREADY_IN_WISHLIST';
  readonly message = 'Expert already in wishlist';
  readonly httpStatus = 409;
}

export class ProductNotInWishlistError extends DomainError {
  readonly code = 'PRODUCT_NOT_IN_WISHLIST';
  readonly message = 'Product not found in wishlist';
  readonly httpStatus = 404;
}

export class ExpertNotInWishlistError extends DomainError {
  readonly code = 'EXPERT_NOT_IN_WISHLIST';
  readonly message = 'Expert not found in wishlist';
  readonly httpStatus = 404;
}

export class ProductNotFoundError extends DomainError {
  readonly code = 'PRODUCT_NOT_FOUND';
  readonly message = 'Product not found';
  readonly httpStatus = 404;
}

export class ExpertNotFoundError extends DomainError {
  constructor(expertId: number, message?: string) {
    super();
    this.message = message || `Expert with ID ${expertId} not found`;
  }
  readonly code = 'EXPERT_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
}

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly message = 'User not found';
  readonly httpStatus = 404;
}

export class NotAnExpertError extends DomainError {
  constructor(expertId: number, roleNames: string) {
    super();
    this.message = `User with ID ${expertId} is not an expert (Roles: ${roleNames})`;
  }
  readonly code = 'NOT_AN_EXPERT';
  readonly message: string;
  readonly httpStatus = 404;
}

export class PujaAlreadyInWishlistError extends DomainError {
  readonly code = 'PUJA_ALREADY_IN_WISHLIST';
  readonly message = 'Puja already in wishlist';
  readonly httpStatus = 409;
}

export class PujaNotInWishlistError extends DomainError {
  readonly code = 'PUJA_NOT_IN_WISHLIST';
  readonly message = 'Puja not found in wishlist';
  readonly httpStatus = 404;
}

export class PujaNotFoundError extends DomainError {
  readonly code = 'PUJA_NOT_FOUND';
  readonly message = 'Puja not found';
  readonly httpStatus = 404;
}
