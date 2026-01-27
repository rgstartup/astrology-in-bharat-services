import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from './dto/profile-client.dto';

@Controller('client')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly service: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  async getProfile(@CurrentUser() user: User) {
    return this.service.findByUserId(user.id);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateProfileClientDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileClientDto,
  ) {
    return this.service.update(user.id, dto);
  }

  @Patch('picture')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfilePicture(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.cloudinaryService.uploadImage(file);
    return this.service.update(user.id, {
      profile_picture: result.secure_url,
    });
  }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('🚀 [UPLOAD-DOCUMENT] Received request from user:', user?.id);
    if (!file) {
      console.warn('⚠️ [UPLOAD-DOCUMENT] No file found in request');
      throw new Error('No file uploaded');
    }
    console.log('📂 [UPLOAD-DOCUMENT] File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    try {
      const result = await this.cloudinaryService.uploadImage(file);
      console.log(
        '✅ [UPLOAD-DOCUMENT] Cloudinary upload successful:',
        result.secure_url,
      );
      return {
        message: 'File uploaded successfully',
        url: result.secure_url,
      };
    } catch (error: any) {
      console.error(
        '❌ [UPLOAD-DOCUMENT] Cloudinary upload failed:',
        error.message,
      );
      throw error;
    }
  }
}
