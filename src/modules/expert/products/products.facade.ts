import { Injectable } from '@nestjs/common';
import { FindExpertProductsUseCase } from './use-cases/find-expert-products.usecase';
import { FindExpertProductByIdUseCase } from './use-cases/find-expert-product-by-id.usecase';
import { GetExpertProductsDto } from './dto/get-expert-products.dto';

@Injectable()
export class ExpertProductsFacade {
  constructor(
    private readonly findExpertProductsUseCase: FindExpertProductsUseCase,
    private readonly findExpertProductByIdUseCase: FindExpertProductByIdUseCase,
  ) {}

  async findExpertProducts(dto: GetExpertProductsDto) {
    return this.findExpertProductsUseCase.execute(dto);
  }

  async findExpertProductById(expertId: number, id: number) {
    return this.findExpertProductByIdUseCase.execute(expertId, id);
  }
}
