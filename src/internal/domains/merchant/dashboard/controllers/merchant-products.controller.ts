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
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { RolesGuard } from '@/internal/auth/guards/role.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { CurrentUser } from '@/shared/decorators/current-user.decorator';
import { ProductService } from '@/internal/commerce/product/product.service';
import { CreateMerchantProductDto } from '../dto/create-merchant-product.dto';
import { BulkUpdateStatusDto } from '../dto/bulk-update-status.dto';
import { GetMerchantProductsDto } from '../dto/get-merchant-products.dto';

@Controller({ path: 'merchant/products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantProductsController {
  constructor(private readonly productService: ProductService) {}

  // GET /api/v1/merchant/products?status=active&search=rudraksha&page=1&limit=20
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser('id') userId: number,
    @Query() dto: GetMerchantProductsDto,
  ) {
    const products = await this.productService.findMerchantProducts(userId, {
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
    const product = await this.productService.findOneMerchantProduct(
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
    const product = await this.productService.createMerchantProduct(userId, dto);
    return { success: true, data: product };
  }

  // PATCH /api/v1/merchant/products/bulk-status
  @Patch('bulk-status')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(
    @CurrentUser('id') userId: number,
    @Body() dto: BulkUpdateStatusDto,
  ) {
    await this.productService.bulkUpdateMerchantProductStatus(
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
    await this.productService.updateMerchantProduct(userId, productId, dto);
    return { success: true };
  }

  // DELETE /api/v1/merchant/products/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) productId: number,
  ) {
    await this.productService.removeMerchantProduct(userId, productId);
    return { success: true };
  }
}
