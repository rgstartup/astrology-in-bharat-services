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
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
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
import { IUser } from '@/common/types/access-token.payload';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { getErrorMessage } from '@/common/utils/get-error-message.util';

@Controller({
  path: 'expert',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileFacade: ExpertProfileFacade,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  getProfile(@CurrentUser() user: IUser) {
    console.log('[ProfileController] GET /expert hit for user:', user.id);
    try {
      return this.profileFacade.getProfile(user);
    } catch (err) {
      console.error('[ProfileController] GET /expert ERROR:', err);
      throw err;
    }
  }

  @Post()
  createProfile(
    @CurrentUser() user: IUser,
    @Body() dto: CreateProfileExpertDto,
  ) {
    return this.profileFacade.createProfile(user, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateProfileExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(user, dto);
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('personal-info')
  async updatePersonalInfo(
    @CurrentUser() user: IUser,
    @Body() dto: UpdatePersonalInfoExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('pricing')
  async updatePricing(
    @CurrentUser() user: IUser,
    @Body() dto: UpdatePricingExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('bank-details')
  async updateBankDetails(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateBankDetailsExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('portfolio')
  async updatePortfolio(
    @CurrentUser() user: IUser,
    @Body() dto: UpdatePortfolioExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('certificates')
  async updateCertificates(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateCertificatesExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('documents')
  async updateDocuments(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateDocumentsExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('experience')
  async updateExperience(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateExperienceExpertDto,
  ) {
    const result = await this.profileFacade.updateProfile(
      user,
      dto as unknown as UpdateProfileExpertDto,
    );
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Patch('status')
  async updateStatus(
    @CurrentUser() user: IUser,
    @Body('is_available') is_available: boolean,
  ) {
    const result = await this.profileFacade.updateStatus(user, is_available);
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
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
  upsertPuja(
    @CurrentUser() user: IUser,
    @Body() dto: ExpertPujaDto,
    @Query('id') id?: string,
  ) {
    return this.profileFacade.upsertPuja(user, dto, id ? id : undefined);
  }

  @Delete('puja/:id')
  async deletePuja(
    @CurrentUser() user: IUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.profileFacade.deletePuja(user, id);
    if (
      result &&
      typeof result === 'object' &&
      'success' in result &&
      'data' in result
    ) {
      const rest = { ...(result as Record<string, unknown>) };
      delete rest['data'];
      return rest;
    }
    return result;
  }

  @Get('pujas/all')
  @Public()
  listAllPujas() {
    return this.profileFacade.listAllPujas();
  }

  @Get('puja/info/:id')
  @Public()
  getPujaById(@Param('id', ParseUUIDPipe) id: string) {
    return this.profileFacade.getPujaById(id);
  }

  @Post('upload-file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() _user: IUser,
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
      const result = (await this.cloudinaryService.uploadImage(file)) as {
        secure_url: string;
        duration?: number;
        public_id?: string;
      };
      const finalUrl = result.secure_url;

      // Backend Duration Validation (30-90 seconds)
      if (file.mimetype.startsWith('video')) {
        const duration = result.duration || 0; // in seconds
        if (duration < 30 || duration > 90) {
          // Delete the invalid video from Cloudinary
          if (result.public_id) {
            await cloudinary.uploader.destroy(result.public_id, {
              resource_type: 'video',
            });
          }

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
        `Upload failed: ${getErrorMessage(error) || 'Unknown error'}`,
      );
    }
  }

  // Alias for backward compatibility
  @Post('upload-document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: IUser,
  ) {
    return this.uploadFile(file, user);
  }

  // Changed from ':id' to 'details/:id' to prevent route conflict with
  // other modules like 'bank-accounts' and avoid path-to-regexp v8 crash matching
  @Get('details/:id')
  @Public()
  getExpertById(@Param('id', ParseUUIDPipe) id: string) {
    return this.profileFacade.getExpertById(id);
  }
}
