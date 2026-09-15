import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadService, VideoUploadService } from '@/external/cloudinary';
import { Public } from '@/common/decorators/public.decorator';
import { IMerchant } from '@/common/types/access-token.payload';
import { MerchantJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentMerchant } from '../../auth/decorators/current-merchant.decorator';
import { MerchantAccountFacade } from '../account.facade';
import { UpdateMerchantAccountDto } from '../dto/request/account.dto';
import { QueryMerchantDto } from '../dto/request/query-merchant.dto';

@Controller({ path: 'merchant/account', version: '1' })
@UseGuards(MerchantJwtAuthGuard)
export class MerchantAccountController {
  constructor(
    private readonly accountFacade: MerchantAccountFacade,
    private readonly imageUploadService: ImageUploadService,
    private readonly videoUploadService: VideoUploadService,
  ) {}

  @Get()
  getAccount(@CurrentMerchant() merchant: IMerchant) {
    return this.accountFacade.getAccount(merchant);
  }

  @Patch()
  updateAccount(
    @CurrentMerchant() merchant: IMerchant,
    @Body() dto: UpdateMerchantAccountDto,
  ) {
    return this.accountFacade.updateAccount(merchant, dto);
  }

  @Patch('status')
  updateStatus(
    @CurrentMerchant() merchant: IMerchant,
    @Body('is_online') isOnline: boolean,
  ) {
    return this.accountFacade.updateStatus(merchant, isOnline);
  }

  @Get('list')
  @Public()
  listAccounts(@Query() query: QueryMerchantDto) {
    return this.accountFacade.listAccounts(query);
  }

  @Get(':id')
  @Public()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountFacade.getById(id);
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

  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    return this.uploadFile(file);
  }
}
