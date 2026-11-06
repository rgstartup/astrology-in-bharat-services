# Sorting Strategy — Usage Guide

## 1. Overview

The sorting system provides a reusable approach for validating, parsing, and implementing multi-field sorting across API resources.

It separates four responsibilities:

1. **Sort DTO** — validates incoming sort parameters against resource-specific allowed fields.
2. **Sort Parser** — converts the query string into structured sort instructions.
3. **Sort Strategy** — translates sort instructions into resource-specific Drizzle ordering expressions.
4. **Use Case** — applies the generated ordering expressions to the database query.

### Query format

Sorting uses a comma-separated list of `field-direction` expressions.

```http
GET /products?sort=price-asc,rating-desc
```

Supported directions:

- `asc` — ascending
- `desc` — descending

The order of expressions determines sort priority.

For example:

```http
?sort=price-asc,rating-desc,created-desc
```

Means:

1. Sort by price ascending.
2. If prices are equal, sort by rating descending.
3. If both are equal, sort by creation date descending.

---

## 2. Directory Structure

```text
shared/
  dto/
    sort.dto.ts
  types/
    sort.type.ts
  utils/
    parse-sort.util.ts

products/
  constants/
    product-sort-fields.ts
  application/
    product-sort.strategy.ts
  dto/
    get-products.dto.ts
```

Each resource maintains its own allowed sorting fields and database implementation.

The shared layer only provides validation infrastructure, types, and parsing.

---

## 3. Define Resource Sort Fields

Create a resource-specific list of supported sort fields.

`products/constants/product-sort-fields.ts`

```ts
export const PRODUCT_SORT_FIELDS = [
  "price",
  "rating",
  "created",
  "popularity",
] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];
```

This constant serves as the source of truth for the resource's allowed sorting fields.

It also provides compile-time type safety when implementing sorting strategies.

---

## 4. Create the Reusable Sort DTO

`shared/dto/sort.dto.ts`

```ts
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
```

The factory accepts an array of allowed fields and generates a DTO with the appropriate validation rules.

This means different resources can have different sorting capabilities without duplicating validation logic.

---

## 5. Create Shared Sort Types

`shared/types/sort.type.ts`

```ts
export type SortDirection = "asc" | "desc";

export interface SortOption<T extends string = string> {
  field: T;
  direction: SortDirection;
}
```

These types represent the parsed sorting instructions.

---

## 6. Create the Sort Parser

`shared/utils/parse-sort.util.ts`

```ts
import { SortOption } from "@/shared/types/sort.type";

export function parseSort<T extends string>(sort?: string): SortOption<T>[] {
  if (!sort) return [];

  return sort.split(",").map((item) => {
    const [field, direction] = item.split("-");

    return {
      field: field as T,
      direction: direction as "asc" | "desc",
    };
  });
}
```

Example:

```ts
const options = parseSort<ProductSortField>("price-asc,rating-desc");
```

Result:

```ts
[
  {
    field: "price",
    direction: "asc",
  },
  {
    field: "rating",
    direction: "desc",
  },
];
```

The parser assumes the DTO has already validated the incoming query.

---

## 7. Implement Resource-Specific DTO

`products/dto/get-products.dto.ts`

```ts
import { IntersectionType } from "@nestjs/mapped-types";
import { IsOptional, IsString } from "class-validator";

import { PaginationDto } from "@/shared/dto/pagination.dto";
import { SortDto } from "@/shared/dto/sort.dto";
import { PRODUCT_SORT_FIELDS } from "../constants/product-sort-fields";

import TrimString from "@/shared/decorators/transform/trim.transform";

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
```

`IntersectionType` combines pagination and sorting DTO metadata.

The resulting DTO supports pagination, sorting, and resource-specific filters.

---

## 8. Implement the Sorting Strategy

`products/application/product-sort.strategy.ts`

```ts
import { asc, desc } from "drizzle-orm";

import { products } from "@/core/database/drizzledb/schema/commerce/products.schema";

import { SortOption } from "@/shared/types/sort.type";
import { ProductSortField } from "../constants/product-sort-fields";

export function productSortStrategy(options: SortOption<ProductSortField>[]) {
  return options.map(({ field, direction }) => {
    switch (field) {
      case "price":
        return direction === "asc" ? asc(products.price) : desc(products.price);

      case "rating":
        return direction === "asc"
          ? asc(products.rating)
          : desc(products.rating);

      case "created":
        return direction === "asc"
          ? asc(products.createdAt)
          : desc(products.createdAt);

      case "popularity":
        return direction === "asc"
          ? asc(products.popularity)
          : desc(products.popularity);
    }
  });
}
```

The sorting strategy is responsible for translating API-level sort fields into database-level ordering expressions.

It can implement:

- Direct column ordering.
- Computed sorting expressions.
- SQL expressions.
- Subqueries and aggregate-based sorting.
- Resource-specific sorting rules.

Do not put database implementation inside DTOs or shared parsing utilities.

---

## 9. Use in the Application Layer

Example product use case:

```ts
async execute(query: GetProductsDto) {
  const sortOptions = parseSort<ProductSortField>(
    query.sort,
  );

  const orderBy = productSortStrategy(sortOptions);

  return this.db
    .select()
    .from(products)
    .orderBy(
      ...(orderBy.length
        ? [...orderBy, asc(products.id)]
        : [desc(products.createdAt), asc(products.id)]),
    )
    .limit(query.limit)
    .offset(query.offset);
}
```

The unique ID is appended as a deterministic tie-breaker for pagination.

If the requested sorting already contains the unique ID, avoid adding it again.

---

## 10. Adding Sorting to Another Resource

For experts, define a different set of supported fields.

`experts/constants/expert-sort-fields.ts`

```ts
export const EXPERT_SORT_FIELDS = [
  "rating",
  "created",
  "name",
  "experience",
] as const;

export type ExpertSortField = (typeof EXPERT_SORT_FIELDS)[number];
```

Generate the DTO:

```ts
const ExpertSortDto = SortDto(EXPERT_SORT_FIELDS);
```

Implement the expert-specific strategy:

```ts
export function expertSortStrategy(options: SortOption<ExpertSortField>[]) {
  return options.map(({ field, direction }) => {
    switch (field) {
      case "rating":
        return direction === "asc" ? asc(experts.rating) : desc(experts.rating);

      case "created":
        return direction === "asc"
          ? asc(experts.createdAt)
          : desc(experts.createdAt);

      case "name":
        return direction === "asc" ? asc(experts.name) : desc(experts.name);

      case "experience":
        return direction === "asc"
          ? asc(experts.experience)
          : desc(experts.experience);
    }
  });
}
```

The shared infrastructure remains unchanged.

---

## 11. Important Rules

1. Every resource must explicitly define its allowed sorting fields.
2. Never accept arbitrary database column names from clients.
3. DTOs handle validation, not database operations.
4. Parsers handle conversion, not validation or database operations.
5. Sorting strategies belong to the resource's application layer.
6. Preserve the order of requested sort expressions.
7. Always provide deterministic ordering when using pagination.
8. Complex sorting should be implemented in the resource-specific strategy.
9. Do not expose internal database column names as part of the public API unless intentionally designed that way.

## 12. Responsibility Summary

| Component               | Responsibility                         |
| ----------------------- | -------------------------------------- |
| `SortDto()`             | Generates resource-specific validation |
| `PRODUCT_SORT_FIELDS`   | Defines allowed fields                 |
| `SortOption`            | Defines structured sort instructions   |
| `parseSort()`           | Parses query strings                   |
| `productSortStrategy()` | Generates Drizzle ordering expressions |
| Product use case        | Applies ordering to the query          |

**Design principle:** Share the sorting infrastructure, but keep sorting behavior resource-specific. The API vocabulary should remain independent of the database schema.
