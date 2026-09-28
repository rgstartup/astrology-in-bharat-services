import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import TrimString from '../decorators/transform/trim.transform';

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
  @IsString()
  @TrimString()
  search?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  role?: string;

  get offset(): number {
    return Math.max(0, (this.page - 1) * this.limit);
  }

  get skip(): number {
    return this.offset;
  }
}

export * from './paginated-response.dto';
