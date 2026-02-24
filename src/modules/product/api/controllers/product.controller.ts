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
    const bodyAsAny = createProductDto as any;
    let imageUrl =
      createProductDto.image_url || bodyAsAny?.imageUrl || bodyAsAny?.image;

    if (files && files.length > 0) {
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
        throw new InternalServerErrorException('Product image upload failed');
      }
    }

    createProductDto.image_url = imageUrl;
    return this.productFacade.create(createProductDto);
  }

  @Get()
  findAll() {
    return this.productFacade.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productFacade.findOne(+id);
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
        console.error('Cloudinary Upload Error:', error);
        throw new InternalServerErrorException('Product image upload failed');
      }
    }
    return this.productFacade.update(+id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.productFacade.remove(+id);
  }
}
