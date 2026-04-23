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
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { ClientProfileFacade } from '../../application/profile.facade';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from '../../infrastructure/persistence/dto/profile-client.dto';
import { SendPhoneOtpDto, VerifyPhoneOtpDto } from '../../infrastructure/persistence/dto/profile-phone-otp.dto';

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileFacade: ClientProfileFacade) { }

  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileFacade.getProfile(user.localUserId);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProfileClientDto,
  ) {
    return this.profileFacade.createProfile(user.localUserId, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileClientDto,
  ) {
    return this.profileFacade.updateProfile(user.localUserId, dto);
  }

  @Patch('picture')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfilePicture(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.updateProfilePicture(user.localUserId, file);
  }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.uploadDocument(user.localUserId, file);
  }

  @Post('phone/send-otp')
  async sendPhoneOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendPhoneOtpDto,
  ) {
    return this.profileFacade.sendPhoneOtp(user.localUserId, dto.phone);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.profileFacade.verifyPhoneOtp(user.localUserId, dto.phone, dto.code);
  }
}
