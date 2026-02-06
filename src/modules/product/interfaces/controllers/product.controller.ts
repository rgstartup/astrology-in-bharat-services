import { Controller, Get, Post, Body, UseGuards, Patch, Param, Delete, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UploadApiResponse } from 'cloudinary';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '@/common/infrastructure/storage/cloudinary/cloudinary.service';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { CreateProductDto } from '../../application/dtos/create-product.dto';
import { UpdateProductDto } from '../../application/dtos/update-product.dto';
import { ProductService } from '../../application/services/product.service';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: memoryStorage(),
    }),
  )
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    let imageUrl = createProductDto.imageUrl; // Keep existing if sent

    if (files && files.length > 0) {
      // Try to pick the first image file
      const file = files[0];
      try {
        const uploadedImage = (await this.cloudinaryService.uploadImage(
          file,
        )) as UploadApiResponse;
        if (uploadedImage?.secure_url) {
          imageUrl = uploadedImage.secure_url;
        }
      } catch (error) {
        console.error('Cloudinary Upload Error:', error);
      }
    }

    createProductDto.imageUrl = imageUrl;
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
    if (file) {
      const uploadedImage = (await this.cloudinaryService.uploadImage(
        file,
      )) as UploadApiResponse;
      if (uploadedImage?.secure_url) {
        updateProductDto.imageUrl = uploadedImage.secure_url;
      }
    }
    // If no new file is uploaded, keep the old imageUrl (already in database)
    // updateProductDto will contain other fields
    return this.productService.update(+id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.productService.remove(+id);
  }
}
