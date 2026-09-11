export class PaginationMetaDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;

  constructor(total: number, page: number = 1, limit: number = 10) {
    const validLimit = Math.max(1, limit || 10);
    const validPage = Math.max(1, page || 1);
    const totalPages = Math.ceil(total / validLimit) || 1;

    this.total = Number(total);
    this.page = Number(validPage);
    this.limit = Number(validLimit);
    this.totalPages = totalPages;
    this.hasNextPage = validPage < totalPages;
    this.hasPrevPage = validPage > 1;
  }
}

export class PaginatedResponseDto<T> {
  success: boolean;
  data: T[];
  meta: PaginationMetaDto;
  message?: string;

  constructor(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
    message?: string,
  ) {
    this.success = true;
    this.data = data;
    this.meta = new PaginationMetaDto(total, page, limit);
    if (message) {
      this.message = message;
    }
  }

  /**
   * Helper factory to create a PaginatedResponseDto using a pagination options object (e.g. PaginationDto)
   */
  static from<T>(
    data: T[],
    total: number,
    pagination: { page?: number; limit?: number },
    message?: string,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto<T>(
      data,
      total,
      pagination.page ?? 1,
      pagination.limit ?? 10,
      message,
    );
  }

  /**
   * Helper factory to create a PaginatedResponseDto with individual arguments
   */
  static create<T>(
    data: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
    message?: string,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto<T>(data, total, page, limit, message);
  }
}
