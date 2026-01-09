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
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';

import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/entities/user.entity';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from './dto/profile-client.dto';

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) { }

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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = './uploads/profiles';
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateProfilePicture(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.update(user.id, {
      profile_picture: file.path.replace(/\\/g, '/'),
    });
  }
}
