import { Controller, Get, Patch, Post, Body, Query, UseGuards, Param, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '@/common/infrastructure/storage/cloudinary/cloudinary.service';
import { Roles } from '@/common/interfaces/decorators/roles.decorator';
import { CurrentUser } from '@/common/interfaces/decorators/current-user.decorator';
import { Public } from '@/common/interfaces/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/interfaces/guards/auth.guard';
import { RolesGuard } from '@/modules/auth/interfaces/guards/role.guard';
import { ProfileService } from '@/modules/expert/application/services/profile.service';
import { User } from '@/modules/users/domain/entities/user.entity';
import { QueryExpertDto } from '../../application/dtos/query-expert.dto';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
  UpdatePersonalInfoExpertDto,
  UpdatePricingExpertDto,
  UpdateBankDetailsExpertDto,
  UpdatePortfolioExpertDto,
  UpdateCertificatesExpertDto,
  UpdateDocumentsExpertDto,
  UpdateExperienceExpertDto,
} from '../../application/dtos/profile-expert.dto';

@Controller({
  path: 'expert',
  version: '1',
})
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

  @Patch('personal-info')
  updatePersonalInfo(
    @CurrentUser() user: User,
    @Body() dto: UpdatePersonalInfoExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
  }

  @Patch('pricing')
  updatePricing(
    @CurrentUser() user: User,
    @Body() dto: UpdatePricingExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
  }

  @Patch('bank-details')
  updateBankDetails(
    @CurrentUser() user: User,
    @Body() dto: UpdateBankDetailsExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
  }

  @Patch('portfolio')
  updatePortfolio(
    @CurrentUser() user: User,
    @Body() dto: UpdatePortfolioExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
  }

  @Patch('certificates')
  updateCertificates(
    @CurrentUser() user: User,
    @Body() dto: UpdateCertificatesExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
  }

  @Patch('documents')
  updateDocuments(
    @CurrentUser() user: User,
    @Body() dto: UpdateDocumentsExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
  }

  @Patch('experience')
  updateExperience(
    @CurrentUser() user: User,
    @Body() dto: UpdateExperienceExpertDto,
  ) {
    return this.expertProfileService.updateProfile(user, dto as any);
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

  @Get('top-rated')
  @Public()
  getTopRatedExperts(@Query('limit') limit: number = 3) {
    return this.expertProfileService.getTopRatedExperts(limit);
  }

  @Get(':id')
  @Public()
  getExpertById(@Param('id', ParseIntPipe) id: number) {
    return this.expertProfileService.getExpertById(id);
  }

  @Post('upload-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('expert')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
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

    try {
      const result = await this.cloudinaryService.uploadImage(file);
      const finalUrl = result.secure_url;

      // Backend Duration Validation (30-90 seconds)
      if (file.mimetype.startsWith('video')) {
        const duration = result.duration; // in seconds
        if (duration < 30 || duration > 90) {
          // Delete the invalid video from Cloudinary
          await cloudinary.uploader.destroy(result.public_id, {
            resource_type: 'video',
          });

          throw new BadRequestException(
            `Video duration must be between 30 and 90 seconds. Your video is ${Math.round(duration)} seconds.`,
          );
        }
      }

      return {
        message: 'File uploaded successfully',
        path: finalUrl,
        url: finalUrl, // Adding url as alias
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      console.error('Upload error:', error);
      throw new InternalServerErrorException(
        `Upload failed: ${error.message || 'Unknown error'}`,
      );
    }
  }

  // Alias for backward compatibility
  @Post('upload-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('expert')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.uploadFile(file, user);
  }
}
