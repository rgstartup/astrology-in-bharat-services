import { IsOptional, IsString, IsBoolean, IsIn } from "class-validator";
import { PaginationDto } from "@/shared/dto/pagination.dto";
import ToBoolean from "@/shared/decorators/transform/bool.transform";

export class GetCategoriesDto extends PaginationDto {
  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(["name", "created_at", "updated_at"])
  sort_by?: "name" | "created_at" | "updated_at" = "created_at";

  @IsOptional()
  @IsString()
  @IsIn(["ASC", "DESC"])
  sort_order?: "ASC" | "DESC" = "DESC";
}
