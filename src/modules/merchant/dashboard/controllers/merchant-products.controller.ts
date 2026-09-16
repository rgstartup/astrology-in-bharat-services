import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ProductFacade } from '@/modules/commerce/product/product.facade';
import { CreateMerchantProductDto } from '../dto/create-merchant-product.dto';
import { BulkUpdateStatusDto } from '../dto/bulk-update-status.dto';
import { GetMerchantProductsDto } from '../dto/get-merchant-products.dto';

@Controller({ path: 'merchant/products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantProductsController {
  constructor(private readonly productFacade: ProductFacade) {}

  // GET /api/v1/merchant/products?status=active&search=rudraksha&page=1&limit=20
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser('id') userId: number,
    @Query() dto: GetMerchantProductsDto,
  ) {
    const products = await this.productFacade.findMerchantProducts(userId, {
      ...dto,
    } as Record<string, unknown>);
    return { success: true, data: products };
  }

  // GET /api/v1/merchant/products/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) productId: number,
  ) {
    const product = await this.productFacade.findOneMerchantProduct(
      userId,
      productId,
    );
    return { success: true, data: product };
  }

  // POST /api/v1/merchant/products
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateMerchantProductDto,
  ) {
    const product = await this.productFacade.createMerchantProduct(userId, dto);
    return { success: true, data: product };
  }

  // PATCH /api/v1/merchant/products/bulk-status
  @Patch('bulk-status')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(
    @CurrentUser('id') userId: number,
    @Body() dto: BulkUpdateStatusDto,
  ) {
    await this.productFacade.bulkUpdateMerchantProductStatus(
      userId,
      dto.ids,
      dto.status,
    );
    return { success: true };
  }

  // PUT /api/v1/merchant/products/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) productId: number,
    @Body() dto: CreateMerchantProductDto,
  ) {
    await this.productFacade.updateMerchantProduct(userId, productId, dto);
    return { success: true };
  }

  // DELETE /api/v1/merchant/products/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) productId: number,
  ) {
    await this.productFacade.removeMerchantProduct(userId, productId);
    return { success: true };
  }
}
