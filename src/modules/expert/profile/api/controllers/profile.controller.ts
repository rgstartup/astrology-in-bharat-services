import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { ExpertProfileFacade } from '../../application/profile.facade';
import {
  CreateProfileExpertDto,
  UpdateProfileExpertDto,
} from '../dto/profile-expert.dto';
import { ExpertPujaDto } from '../dto/expert-puja.dto';
import { UpdatePersonalInfoExpertDto } from '../dto/update-personal-info-expert.dto';
import { UpdatePricingExpertDto } from '../dto/update-pricing-expert.dto';
import { UpdateBankDetailsExpertDto } from '../dto/update-bank-details-expert.dto';
import { UpdatePortfolioExpertDto } from '../dto/update-portfolio-expert.dto';
import { UpdateCertificatesExpertDto } from '../dto/update-certificates-expert.dto';
import { UpdateDocumentsExpertDto } from '../dto/expert-document.dto';
import { UpdateExperienceExpertDto } from '../dto/detailed-experience.dto';
import { QueryExpertDto } from '../dto/query-expert.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';

@Controller({
  path: 'expert',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileFacade: ExpertProfileFacade,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    console.log('[ProfileController] GET /expert hit for user:', user.id);
    try {
      return this.profileFacade.getProfile(user.id);
    } catch (err) {
      console.error('[ProfileController] GET /expert ERROR:', err);
      throw err;
    }
  }

  @Post()
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfileExpertDto,
  ) {
    return this.profileFacade.createProfile(user.id, dto);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto);
  }

  @Patch('personal-info')
  updatePersonalInfo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePersonalInfoExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('pricing')
  updatePricing(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePricingExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('bank-details')
  updateBankDetails(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBankDetailsExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('portfolio')
  updatePortfolio(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePortfolioExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('certificates')
  updateCertificates(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCertificatesExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('documents')
  updateDocuments(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDocumentsExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('experience')
  updateExperience(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateExperienceExpertDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto as any);
  }

  @Patch('status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body('is_available') is_available: boolean,
  ) {
    return this.profileFacade.updateStatus(user.id, is_available);
  }

  @Get('list')
  @Public()
  listExperts(@Query() query: QueryExpertDto) {
    return this.profileFacade.listExperts(query);
  }

  @Get('top-rated')
  @Public()
  getTopRatedExperts(@Query('limit') limit: number = 3) {
    return this.profileFacade.getTopRatedExperts(limit);
  }

  @Post('puja')
  @Roles('expert')
  upsertPuja(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExpertPujaDto,
    @Query('id') id?: number,
  ) {
    return this.profileFacade.upsertPuja(user.id, dto, id ? Number(id) : undefined);
  }

  @Delete('puja/:id')
  @Roles('expert')
  deletePuja(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.profileFacade.deletePuja(user.id, id);
  }

  @Get('pujas/all')
  @Public()
  listAllPujas() {
    return this.profileFacade.listAllPujas();
  }

  @Get('puja/info/:id')
  @Public()
  getPujaById(@Param('id', ParseIntPipe) id: number) {
    return this.profileFacade.getPujaById(id);
  }


  @Post('upload-file')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('expert')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
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
        url: finalUrl,
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
  @Roles('agent')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.uploadFile(file, user);
  }

  // Changed from ':id' to 'details/:id' to prevent route conflict with
  // other modules like 'bank-accounts' and avoid path-to-regexp v8 crash matching
  @Get('details/:id')
  @Public()
  getExpertById(@Param('id', ParseIntPipe) id: number) {
    return this.profileFacade.getExpertById(id);
  }
}
