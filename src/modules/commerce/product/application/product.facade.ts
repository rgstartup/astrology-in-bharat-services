import { Injectable } from '@nestjs/common';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './use-cases/find-all-products.use-case';
import { FindProductUseCase } from './use-cases/find-product.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { RemoveProductUseCase } from './use-cases/remove-product.use-case';
import { MerchantProductsUseCase } from './use-cases/merchant-products.usecase';
import { CreateProductDto } from '../api/dto/create-product.dto';
import { UpdateProductDto } from '../api/dto/update-product.dto';
import { GetProductsDto } from '../api/dto/get-products.dto';

@Injectable()
export class ProductFacade {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly findAllProductsUseCase: FindAllProductsUseCase,
    private readonly findProductUseCase: FindProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly removeProductUseCase: RemoveProductUseCase,
    private readonly merchantProductsUseCase: MerchantProductsUseCase,
  ) {}

  create(dto: CreateProductDto) {
    return this.createProductUseCase.execute(dto);
  }

  findAll(dto: GetProductsDto = {}) {
    return this.findAllProductsUseCase.execute(dto);
  }

  findOne(id: string) {
    return this.findProductUseCase.execute(id);
  }

  update(id: string, dto: UpdateProductDto) {
    return this.updateProductUseCase.execute(id, dto);
  }

  remove(id: string) {
    return this.removeProductUseCase.execute(id);
  }

  // Merchant Dashboard Specific Methods
  findMerchantProducts(merchantId: string, opts: Record<string, unknown>) {
    return this.merchantProductsUseCase.findAll(merchantId, opts);
  }

  createMerchantProduct(
    merchantId: string,
    dto: import('@/modules/merchant/dashboard/api/dto/create-merchant-product.dto').CreateMerchantProductDto,
  ) {
    return this.merchantProductsUseCase.create(merchantId, dto);
  }

  updateMerchantProduct(
    merchantId: string,
    productId: string,
    dto: Partial<
      import('@/modules/merchant/dashboard/api/dto/create-merchant-product.dto').CreateMerchantProductDto
    >,
  ) {
    return this.merchantProductsUseCase.update(merchantId, productId, dto);
  }

  removeMerchantProduct(merchantId: string, productId: string) {
    return this.merchantProductsUseCase.remove(merchantId, productId);
  }

  bulkUpdateMerchantProductStatus(
    merchantId: string,
    ids: string[],
    status: import('@/modules/merchant/dashboard/api/dto/create-merchant-product.dto').MerchantProductStatus,
  ) {
    return this.merchantProductsUseCase.bulkUpdateStatus(
      merchantId,
      ids,
      status,
    );
  }

  findOneMerchantProduct(merchantId: string, productId: string) {
    return this.merchantProductsUseCase.findOne(merchantId, productId);
  }

  getMerchantStockLevels(merchantId: string) {
    return this.merchantProductsUseCase.getMerchantStockLevels(merchantId);
  }
}
