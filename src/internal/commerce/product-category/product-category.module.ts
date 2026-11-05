import { Module } from '@nestjs/common';
import { CategoryController } from './controllers/category.controller';
import { ProductCategoryService } from './product-category.service';
import { CreateCategoryUseCase } from './use-cases/create-category.use-case';
import { FindAllCategoriesUseCase } from './use-cases/find-all-categories.use-case';
import { FindCategoryUseCase } from './use-cases/find-category.use-case';
import { UpdateCategoryUseCase } from './use-cases/update-category.use-case';
import { RemoveCategoryUseCase } from './use-cases/remove-category.use-case';

@Module({
  controllers: [CategoryController],
  providers: [
    ProductCategoryService,
    CreateCategoryUseCase,
    FindAllCategoriesUseCase,
    FindCategoryUseCase,
    UpdateCategoryUseCase,
    RemoveCategoryUseCase,
  ],
  exports: [ProductCategoryService, FindCategoryUseCase, FindAllCategoriesUseCase],
})
export class ProductCategoryModule {}