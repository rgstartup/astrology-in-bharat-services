// pagination.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;

  @IsOptional()
  search?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  role?: string;

get offset(): number {
    return (this.page - 1) * this.limit;
  }
}