import {
  Controller,
  Get,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  InternalServerErrorException,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { memoryStorage } from 'multer';
import { ProductService } from '../product.service';
import { UpdateProductDto, GetProductsDto } from '../dto';
import { JwtAuthGuard } from '@/internal/auth/guards/auth.guard';
import { RolesGuard } from '@/internal/auth/guards/role.guard';
import { Roles } from '@/shared/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadService } from '@/external/cloudinary';
import { UploadApiResponse } from 'cloudinary';

@Controller({
  path: 'products',
  version: '1',
})
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  @Get()
  findAll(@Query() dto: GetProductsDto) {
    return this.productService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const bodyAsAny = updateProductDto as Record<string, unknown>;
    if (!updateProductDto?.image_url) {
      updateProductDto.image_url =
        (bodyAsAny?.image_url as string) || (bodyAsAny?.image as string);
    }

    if (file) {
      try {
        const uploadedImage = (await this.imageUploadService.uploadImage(
          file,
        )) as UploadApiResponse;
        if (uploadedImage?.secure_url) {
          updateProductDto.image_url = uploadedImage.secure_url;
        }
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : 'Unknown Cloudinary error';
        console.error('Cloudinary Upload Error:', error);
        throw new InternalServerErrorException(
          process.env.NODE_ENV === 'production'
            ? 'Product image upload failed'
            : `Product image upload failed: ${reason}`,
        );
      }
    }
    await this.productService.update(id, updateProductDto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productService.remove(id);
    return { success: true };
  }
}
