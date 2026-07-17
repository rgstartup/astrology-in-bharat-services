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
import { IUser } from '@/common/types/access-token.payload';
import { ClientProfileFacade } from '../../application/profile.facade';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from '../../infrastructure/dto/profile-client.dto';
import {
  SendPhoneOtpDto,
  VerifyPhoneOtpDto,
} from '../../infrastructure/dto/profile-phone-otp.dto';

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileFacade: ClientProfileFacade) {}

  @Get()
  async getProfile(@CurrentUser() user: IUser) {
    return this.profileFacade.getProfile(user, undefined);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: IUser,
    @Body() dto: CreateProfileClientDto,
  ) {
    return this.profileFacade.createProfile(user.id, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateProfileClientDto,
  ) {
    const _result = await this.profileFacade.updateProfile(user, dto);
    return { success: true };
  }

  @Patch('picture')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async updateProfilePicture(
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const _result = await this.profileFacade.updateProfilePicture(user, file);
    return { success: true };
  }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadDocument(
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.uploadDocument(user.id, file);
  }

  @Post('phone/send-otp')
  async sendPhoneOtp(@CurrentUser() user: IUser, @Body() dto: SendPhoneOtpDto) {
    return this.profileFacade.sendPhoneOtp(user.id, dto);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(
    @CurrentUser() user: IUser,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.profileFacade.verifyPhoneOtp(user.id, dto);
  }
}
