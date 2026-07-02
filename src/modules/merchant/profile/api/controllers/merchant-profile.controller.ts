import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/modules/auth/api/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { IUser } from '@/common/types/access-token.payload';
import { GetMerchantProfileUseCase } from '../../application/use-cases/get-merchant-profile.use-case';
import { UpdateMerchantProfileUseCase } from '../../application/use-cases/update-merchant-profile.use-case';
import { UpdateMerchantProfileDto } from '../dto/update-merchant-profile.dto';

import { RolesGuard } from '@/modules/auth/api/guards/role.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@Controller({
  path: 'merchant/profile',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MERCHANT', 'AGENT', 'EXPERT')
export class MerchantProfileController {
  constructor(
    private readonly getProfile: GetMerchantProfileUseCase,
    private readonly updateProfile: UpdateMerchantProfileUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findOne(@CurrentUser() user: IUser) {
    return this.getProfile.execute(user);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
      { name: 'gstCertificate', maxCount: 1 },
      { name: 'panFront', maxCount: 1 },
      { name: 'panBack', maxCount: 1 },
      { name: 'aadharFront', maxCount: 1 },
      { name: 'aadharBack', maxCount: 1 },
    ]),
  )
  async update(
    @CurrentUser() user: IUser,
    @Body() dto: UpdateMerchantProfileDto,
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      video?: Express.Multer.File[];
      gstCertificate?: Express.Multer.File[];
      panFront?: Express.Multer.File[];
      panBack?: Express.Multer.File[];
      aadharFront?: Express.Multer.File[];
      aadharBack?: Express.Multer.File[];
    },
  ) {
    const result = await this.updateProfile.execute(user, dto, files);
    if (result && result.success && 'data' in result) {
      const copy = { ...(result as Record<string, unknown>) };
      delete copy.data;
      return copy;
    }
    return result;
  }
}
