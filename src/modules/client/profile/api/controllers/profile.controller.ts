// @ts-nocheck
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
import { CurrentUser, IUser } from '@/common/decorators/current-user.decorator';
import { User } from '@/modules/users/infrastructure/entities/user.entity';
import { ClientProfileFacade } from '../../application/profile.facade';
import {
  CreateProfileClientDto,
  UpdateProfileClientDto,
} from '../../infrastructure/dto/profile-client.dto';
import { SendPhoneOtpDto, VerifyPhoneOtpDto } from '../../infrastructure/dto/profile-phone-otp.dto';

@Controller('client/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileFacade: ClientProfileFacade) { }

  @Get()
  async getProfile(@CurrentUser() user: IUser) {
    return this.profileFacade.getProfile(user);
  }

  @Post()
  async createProfile(
    @CurrentUser() user: IUser,
    @Body() dto: CreateProfileClientDto,
  ) {
    return this.profileFacade.createProfile(user, dto);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateProfileClientDto,
  ) {
    return this.profileFacade.updateProfile(user, dto);
  }

  @Patch('picture')
  @UseInterceptors(FileInterceptor('file'))
  async updateProfilePicture(
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.updateProfilePicture(user.id, file);
  }

  @Post('upload-document')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: IUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.profileFacade.uploadDocument(user.id, file);
  }

  @Post('phone/send-otp')
  async sendPhoneOtp(
    @CurrentUser() user: IUser,
    @Body() dto: SendPhoneOtpDto,
  ) {
    return this.profileFacade.sendPhoneOtp(user.id, dto.phone);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(
    @CurrentUser() user: IUser,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.profileFacade.verifyPhoneOtp(user.id, dto.phone, dto.code);
  }
}
