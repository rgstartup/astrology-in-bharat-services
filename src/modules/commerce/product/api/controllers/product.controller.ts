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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductFacade } from '../../application/product.facade';
import { UpdateProductDto } from '../dto/update-product.dto';
import { GetProductsDto } from '../dto/get-products.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

@Controller({
  path: 'products',
  version: '1',
})
export class ProductController {
  constructor(
    private readonly productFacade: ProductFacade,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  findAll(
    @Query() dto: GetProductsDto,
  ) {
    return this.productFacade.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productFacade.findOne(id);
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
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const bodyAsAny = updateProductDto as Record<string, unknown>;
    if (!updateProductDto.image_url) {
      updateProductDto.image_url =
        (bodyAsAny?.image_url as string) || (bodyAsAny?.image as string);
    }

    if (file) {
      try {
        const uploadedImage = (await this.cloudinaryService.uploadImage(
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
    const _result = await this.productFacade.update(id, updateProductDto);
    return { success: true };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const _result = await this.productFacade.remove(id);
    return { success: true };
  }
}
