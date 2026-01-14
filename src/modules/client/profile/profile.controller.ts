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

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly service: ProfileService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

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
}
