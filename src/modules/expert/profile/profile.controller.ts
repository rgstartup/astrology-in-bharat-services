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

@Controller('expert/profile')
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
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
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

    // If result has public_id (it should), we might want to return that too, 
    // but the original code returned a path. 
    // The previous implementation returned:
    // path: `/uploads/experts/${file.filename}`

    // Cloudinary returns a full URL.

    return {
      message: 'File uploaded successfully',
      path: finalUrl,
    };
  }
}
