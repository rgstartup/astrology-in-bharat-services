// @ts-nocheck
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  InternalServerErrorException,
  Query,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProductFacade } from '../../application/product.facade';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
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
  ) { }

  

  @Get()
  findAll(
    @Query('merchantId') merchantId?: string,
    @Query('page', new DefaultValuePipe(1), ParseUUIDPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseUUIDPipe) limit: number = 10,
  ) {
    return this.productFacade.findAll({
      merchantId: merchantId ? +merchantId : undefined,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productFacade.findOne(+id);
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
    const bodyAsAny = updateProductDto as any;
    if (!updateProductDto.image_url) {
      updateProductDto.image_url = bodyAsAny?.imageUrl || bodyAsAny?.image;
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
    return this.productFacade.update(+id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productFacade.remove(id);
  }
}
