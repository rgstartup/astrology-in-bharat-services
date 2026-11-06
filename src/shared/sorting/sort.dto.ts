import { IsOptional, IsString, Matches } from "class-validator";
import TrimString from "@/shared/decorators/transform/trim.transform";

export function SortDto<const T extends readonly string[]>(fields: T) {
  const escapedFields = fields.map((field) =>
    field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );

  const fieldPattern = escapedFields.join("|");

  const pattern = new RegExp(
    `^(${fieldPattern})-(asc|desc)(,(${fieldPattern})-(asc|desc))*$`,
  );

  class SortQueryDto {
    @IsOptional()
    @IsString()
    @TrimString()
    @Matches(pattern, {
      message: `Invalid sort. Allowed fields: ${fields.join(", ")}`,
    })
    sort?: string;
  }

  return SortQueryDto;
}
