import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    UploadedFile,
    InternalServerErrorException,
    Req,
    UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';
import { ExpertProfileFacade } from '@/modules/expert/profile/application/profile.facade';
import { ProductFacade } from '../../application/product.facade';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Controller({ path: 'expert/products', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('expert')
export class ExpertProductController {
    constructor(
        private readonly productFacade: ProductFacade,
        private readonly cloudinaryService: CloudinaryService,
        private readonly expertProfileFacade: ExpertProfileFacade,
    ) { }

    /** GET /api/v1/expert/products — list only this expert's products */
    @Get()
    async findMyProducts(@Req() req: Request) {
        const userId = (req as any).user?.id;
        const expert = await this.expertProfileFacade.getExpertByUserId(userId);
        if (!expert) throw new UnauthorizedException('Expert profile not found');
        return this.productFacade.findByExpert(expert.id);
    }

    /** POST /api/v1/expert/products — create a product owned by this expert */
    @Post()
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    async create(
        @Body() dto: CreateProductDto,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        const userId = (req as any).user?.id;
        const expert = await this.expertProfileFacade.getExpertByUserId(userId);
        if (!expert) throw new UnauthorizedException('Expert profile not found');
        dto.expert_id = expert.id;

        if (file) {
            try {
                const uploaded = (await this.cloudinaryService.uploadImage(file)) as UploadApiResponse;
                if (uploaded?.secure_url) dto.image_url = uploaded.secure_url;
            } catch (error) {
                const reason = error instanceof Error ? error.message : 'Unknown error';
                throw new InternalServerErrorException(`Product image upload failed: ${reason}`);
            }
        }

        return this.productFacade.create(dto);
    }

    /** PATCH /api/v1/expert/products/:id */
    @Patch(':id')
    @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateProductDto,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
    ) {
        const userId = (req as any).user?.id;
        const expert = await this.expertProfileFacade.getExpertByUserId(userId);
        if (!expert) throw new UnauthorizedException('Expert profile not found');
        dto.expert_id = expert.id;

        if (file) {
            try {
                const uploaded = (await this.cloudinaryService.uploadImage(file)) as UploadApiResponse;
                if (uploaded?.secure_url) dto.image_url = uploaded.secure_url;
            } catch (error) {
                const reason = error instanceof Error ? error.message : 'Unknown error';
                throw new InternalServerErrorException(`Product image upload failed: ${reason}`);
            }
        }

        return this.productFacade.update(+id, dto);
    }

    /** DELETE /api/v1/expert/products/:id */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productFacade.remove(+id);
    }
}
