import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "@/shared/dto/pagination.dto";
import TrimString from "@/shared/decorators/transform/trim.transform";
import { IntersectionType } from "@nestjs/mapped-types";
import { SortDto } from "@/shared/sorting/sort.dto";

export const PRODUCT_SORT_FIELDS = [
  "price",
  "rating",
  "created",
  "popularity",
] as const;

const ProductSortDto = SortDto(PRODUCT_SORT_FIELDS);

export class GetProductsDto extends IntersectionType(
  PaginationDto,
  ProductSortDto,
) {
  @IsOptional()
  @IsString()
  @TrimString()
  declare search?: string;

  @IsOptional()
  @IsString()
  @TrimString()
  category?: string;
}
