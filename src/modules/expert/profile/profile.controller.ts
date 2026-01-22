import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '@/common/cloudinary/cloudinary.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/role.guard';
import { ProfileService } from './profile.service';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from './dto/profile-expert.dto';
import { QueryExpertDto } from './dto/query-expert.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';

@Controller('expert')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly expertProfileService: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.expertProfileService.getProfile(user);
  }

  @Post()
  createProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateProfileExpertDto,
  ) {
    return this.expertProfileService.createProfile(user, dto);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto);
  }

  @Patch('status')
  updateStatus(
    @CurrentUser() user: User,
    @Body('is_available') is_available: boolean,
  ) {
    return this.expertProfileService.updateStatus(user, is_available);
  }

  @Get('list')
  @Public()
  listExperts(@Query() query: QueryExpertDto) {
    return this.expertProfileService.listExperts(query);
  }

  @Get(':id')
  @Public()
  getExpertById(@Param('id', ParseIntPipe) id: number) {
    return this.expertProfileService.getExpertById(id);
  }

  @Post('upload-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('expert')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedMimeTypes =
      /^image\/(jpeg|jpg|png|webp|avif)$|^application\/pdf$|^video\/(mp4|webm|quicktime)$/;
    if (!allowedMimeTypes.test(file.mimetype)) {
      throw new BadRequestException(
        `Validation failed (current file type is ${file.mimetype}, expected type is image/(jpeg|jpg|png|webp|avif), application/pdf or video/(mp4|webm|quicktime))`,
      );
    }

    const result = await this.cloudinaryService.uploadImage(file);
    let finalUrl = result.secure_url;

    // Backend Duration Validation (30-90 seconds)
    if (file.mimetype.startsWith('video')) {
      const duration = result.duration; // in seconds
      if (duration < 30 || duration > 90) {
        // Delete the invalid video from Cloudinary
        await cloudinary.uploader.destroy(result.public_id, { resource_type: 'video' });

        throw new BadRequestException(
          `Video duration must be between 30 and 90 seconds. Your video is ${Math.round(duration)} seconds.`,
        );
      }
    }

    // Automatically add document to profile
    // await this.expertProfileService.addDocument(user, finalUrl);

    return {
      message: 'File uploaded successfully',
      path: finalUrl,
    };
  }
}
