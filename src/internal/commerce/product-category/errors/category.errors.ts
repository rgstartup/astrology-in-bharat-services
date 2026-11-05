import { DomainError } from '@/shared/types/domain.error';

export class CategoryNotFoundError extends DomainError {
  constructor(categoryId: number | string) {
    super();
    this.message = `Category with ID ${categoryId} not found`;
  }
  readonly code = 'CATEGORY_NOT_FOUND';
  readonly message: string;
  readonly httpStatus = 404;
}

export class CategorySlugExistsError extends DomainError {
  constructor(slug: string) {
    super();
    this.message = `Category with slug "${slug}" already exists`;
  }
  readonly code = 'CATEGORY_SLUG_EXISTS';
  readonly message: string;
}

export class CategoryNameExistsError extends DomainError {
  constructor(name: string) {
    super();
    this.message = `Category with name "${name}" already exists`;
  }
  readonly code = 'CATEGORY_NAME_EXISTS';
  readonly message: string;
}