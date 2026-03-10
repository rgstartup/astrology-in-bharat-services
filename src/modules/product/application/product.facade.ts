import { Injectable } from '@nestjs/common';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './use-cases/find-all-products.use-case';
import { FindProductUseCase } from './use-cases/find-product.use-case';
import { FindProductsByExpertUseCase } from './use-cases/find-products-by-expert.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { RemoveProductUseCase } from './use-cases/remove-product.use-case';
import { CreateProductDto } from '../api/dto/create-product.dto';
import { UpdateProductDto } from '../api/dto/update-product.dto';

@Injectable()
export class ProductFacade {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly findAllProductsUseCase: FindAllProductsUseCase,
    private readonly findProductUseCase: FindProductUseCase,
    private readonly findProductsByExpertUseCase: FindProductsByExpertUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly removeProductUseCase: RemoveProductUseCase,
  ) { }

  create(dto: CreateProductDto) {
    return this.createProductUseCase.execute(dto);
  }

  findAll() {
    return this.findAllProductsUseCase.execute();
  }

  findByExpert(expertId: number) {
    return this.findProductsByExpertUseCase.execute(expertId);
  }

  findOne(id: number) {
    return this.findProductUseCase.execute(id);
  }

  update(id: number, dto: UpdateProductDto) {
    return this.updateProductUseCase.execute(id, dto);
  }

  remove(id: number) {
    return this.removeProductUseCase.execute(id);
  }
}
