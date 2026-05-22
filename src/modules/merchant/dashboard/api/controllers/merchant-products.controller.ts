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
  ParseUUIDPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { MerchantProductsUseCase } from '../../application/use-cases/merchant-products.usecase';
import { CreateMerchantProductDto } from '../dto/create-merchant-product.dto';
import { BulkUpdateStatusDto } from '../dto/bulk-update-status.dto';

@Controller({ path: 'merchant/products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantProductsController {
  constructor(private readonly merchantProducts: MerchantProductsUseCase) {}

  // GET /api/v1/merchant/products?status=active&search=rudraksha&page=1&limit=20
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseUUIDPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseUUIDPipe) limit: number = 20,
  ) {
    const products = await this.merchantProducts.findAll(userId as any, { status, search, page, limit });
    return { success: true, data: products };
  }

  // GET /api/v1/merchant/products/:id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) productId: number,
  ) {
    const product = await this.merchantProducts.findOne(userId as any, productId);
    return { success: true, data: product };
  }

  // POST /api/v1/merchant/products
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMerchantProductDto,
  ) {
    const product = await this.merchantProducts.create(userId as any, dto);
    return { success: true, data: product };
  }

  // PATCH /api/v1/merchant/products/bulk-status
  @Patch('bulk-status')
  @HttpCode(HttpStatus.OK)
  async bulkStatus(
    @CurrentUser('id') userId: string,
    @Body() dto: BulkUpdateStatusDto,
  ) {
    const result = await this.merchantProducts.bulkUpdateStatus(userId as any, dto.ids, dto.status);
    return { success: true, data: result };
  }

  // PUT /api/v1/merchant/products/:id
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) productId: number,
    @Body() dto: CreateMerchantProductDto,
  ) {
    const product = await this.merchantProducts.update(userId as any, productId, dto);
    return { success: true, data: product };
  }

  // DELETE /api/v1/merchant/products/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) productId: number,
  ) {
    const result = await this.merchantProducts.remove(userId as any, productId);
    return { success: true, data: result };
  }
}
