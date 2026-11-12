import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ImageUploadService,
  VideoUploadService,
} from '@/external/cloudinary';
import { Public } from '@/shared/decorators/public.decorator';
import { type IMerchant } from '@/shared/types/access-token.payload';
import { MerchantJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentMerchant } from '../../auth/decorators/current-merchant.decorator';
import { MerchantAccountService } from '../account.service';
import { UpdateMerchantAccountDto } from '../dto/request/account.dto';
import { QueryMerchantDto } from '../dto/request/query-merchant.dto';
import { StorageService } from '@/external/storage/storage.service';

@Controller({ path: 'merchant/account', version: '1' })
@UseGuards(MerchantJwtAuthGuard)
export class MerchantAccountController {
  constructor(
    private readonly accountService: MerchantAccountService,
    private readonly imageUploadService: ImageUploadService,
    private readonly videoUploadService: VideoUploadService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getAccount(@CurrentMerchant() merchant: IMerchant) {
    return this.accountService.getAccount(merchant);
  }

  @Patch()
  updateAccount(
    @CurrentMerchant() merchant: IMerchant,
    @Body() dto: UpdateMerchantAccountDto,
  ) {
    return this.accountService.updateAccount(merchant, dto);
  }

  @Patch('status')
  updateStatus(
    @CurrentMerchant() merchant: IMerchant,
    @Body('is_online') isOnline: boolean,
  ) {
    return this.accountService.updateStatus(merchant, isOnline);
  }

  @Get('list')
  @Public()
  listAccounts(@Query() query: QueryMerchantDto) {
    return this.accountService.listAccounts(query);
  }

  @Get(':id')
  @Public()
  getById(@Param('id', ParseIntPipe) id: number) {
    return this.accountService.getById(id);
  }

  @Post('upload-file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');
    const allowed =
      /^image\/(jpeg|jpg|png|webp|avif)$|^application\/pdf$|^video\/(mp4|webm|quicktime)$/;
    if (!allowed.test(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }
    const result = file.mimetype.startsWith('video')
      ? await this.videoUploadService.uploadVideo(file)
      : await this.imageUploadService.uploadImage(file);
    return {
      message: 'File uploaded successfully',
      path: result.secure_url,
      url: result.secure_url,
    };
  }

  @Post('avatar/upload-signature')
  async avatarUploadSignature(
    @CurrentMerchant() merchant: IMerchant,
    @Body() dto: { folder?: string; resourceType?: string },
  ) {
    const params = await this.storageService.getSignedUploadParams({
      folder: dto?.folder ?? 'avatars',
      resourceType: dto?.resourceType ?? 'image',
    });
    return {
      message: 'Signed upload params generated',
      data: params,
    };
  }

  @Post('avatar/verify')
  async avatarVerify(
    @CurrentMerchant() merchant: IMerchant,
    @Body() dto: {
      publicId: string;
      folder?: string;
      resourceType?: string;
      maxSizeBytes?: number;
      allowedMimeTypes?: string[];
    },
  ) {
    const verified = await this.storageService.verifyUpload(dto.publicId, {
      folder: dto.folder ?? 'avatars',
      resourceType: dto.resourceType ?? 'image',
      maxSizeBytes: dto.maxSizeBytes ?? 5 * 1024 * 1024,
      allowedMimeTypes: dto.allowedMimeTypes ?? [
        'image/jpeg',
        'image/png',
        'image/webp',
      ],
    });

    // Persist the verified avatar URL on the merchant account record
    await this.accountService.updateAccount(merchant, {
      avatar: verified.secureUrl,
    });

    return {
      message: 'Avatar verified and updated',
      data: verified,
    };
  }

  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.uploadFile(file);
  }
}
