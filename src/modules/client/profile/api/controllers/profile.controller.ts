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
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/persistence/entities/user.entity';
import { ProfileFacade } from '../../application/profile.facade';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from '../../infrastructure/persistence/dto/profile-client.dto';

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileFacade: ProfileFacade) {}

  @Get()
  async getProfile(@CurrentUser() user: User) {
    return this.profileFacade.getProfile(user.id);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: User,
    @Body() dto: CreateProfileClientDto,
  ) {
    return this.profileFacade.createProfile(user.id, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileClientDto,
  ) {
    return this.profileFacade.updateProfile(user.id, dto);
  }

  @Patch('picture')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfilePicture(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.updateProfilePicture(user.id, file);
  }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.uploadDocument(user.id, file);
  }
}
