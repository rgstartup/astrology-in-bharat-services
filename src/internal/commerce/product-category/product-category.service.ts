import { Injectable } from "@nestjs/common";
import { CreateCategoryUseCase } from "./use-cases/create-category.use-case";
import { FindAllCategoriesUseCase } from "./use-cases/find-all-categories.use-case";
import { FindCategoryUseCase } from "./use-cases/find-category.use-case";
import { UpdateCategoryUseCase } from "./use-cases/update-category.use-case";
import { RemoveCategoryUseCase } from "./use-cases/remove-category.use-case";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { GetCategoriesDto } from "./dto/get-categories.dto";
import { PaginatedResponseDto } from "@/shared/dto/paginated-response.dto";
import { ProductCategoryRow } from "@/core/drizzledb/schema";

@Injectable()
export class ProductCategoryService {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
    private readonly findCategoryUseCase: FindCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly removeCategoryUseCase: RemoveCategoryUseCase,
  ) {}

  create(dto: CreateCategoryDto) {
    return this.createCategoryUseCase.execute(dto);
  }

  findAll(
    dto: GetCategoriesDto,
  ): Promise<PaginatedResponseDto<ProductCategoryRow>> {
    return this.findAllCategoriesUseCase.execute(dto);
  }

  findOne(id: number) {
    return this.findCategoryUseCase.execute(id);
  }

  update(id: number, dto: UpdateCategoryDto) {
    return this.updateCategoryUseCase.execute(id, dto);
  }

  remove(id: number) {
    return this.removeCategoryUseCase.execute(id);
  }
}
