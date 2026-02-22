import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/api/guards/auth.guard';
import { RolesGuard } from '../auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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
