import { Injectable } from '@nestjs/common';
import { CreateProductUseCase } from './use-cases/create-product.use-case';
import { FindAllProductsUseCase } from './use-cases/find-all-products.use-case';
import { FindProductUseCase } from './use-cases/find-product.use-case';
import { UpdateProductUseCase } from './use-cases/update-product.use-case';
import { RemoveProductUseCase } from './use-cases/remove-product.use-case';
import { MerchantProductsUseCase } from './use-cases/merchant-products.usecase';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import {
  CreateMerchantProductDto,
  MerchantProductStatus,
} from '@/modules/merchant/dashboard/dto/create-merchant-product.dto';

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

  findAll(dto: GetProductsDto) {
    return this.findAllProductsUseCase.execute(dto);
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

  // Merchant Dashboard Specific Methods
  findMerchantProducts(merchantId: number, opts: Record<string, unknown>) {
    return this.merchantProductsUseCase.findAll(merchantId, opts);
  }

  createMerchantProduct(merchantId: number, dto: CreateMerchantProductDto) {
    return this.merchantProductsUseCase.create(merchantId, dto);
  }

  updateMerchantProduct(
    merchantId: number,
    productId: number,
    dto: Partial<CreateMerchantProductDto>,
  ) {
    return this.merchantProductsUseCase.update(merchantId, productId, dto);
  }

  removeMerchantProduct(merchantId: number, productId: number) {
    return this.merchantProductsUseCase.remove(merchantId, productId);
  }

  bulkUpdateMerchantProductStatus(
    merchantId: number,
    ids: number[],
    status: MerchantProductStatus,
  ) {
    return this.merchantProductsUseCase.bulkUpdateStatus(
      merchantId,
      ids,
      status,
    );
  }

  findOneMerchantProduct(merchantId: number, productId: number) {
    return this.merchantProductsUseCase.findOne(merchantId, productId);
  }

  getMerchantStockLevels(merchantId: number) {
    return this.merchantProductsUseCase.getMerchantStockLevels(merchantId);
  }
}
