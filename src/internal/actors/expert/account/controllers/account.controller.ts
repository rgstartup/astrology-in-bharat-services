import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Logger,
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
import { ImageUploadService, VideoUploadService } from '@/external/cloudinary';
import { CurrentExpert } from '@/internal/actors/expert/auth/decorators/current-expert.decorator';
import { type IExpert } from '@/shared/types/access-token.payload';
import { ExpertJwtAuthGuard } from '@/internal/actors/expert/auth/guards/auth.guard';
import { ExpertAccountService } from '../account.service';
import { UpdateExpertAccountDto } from '../dto/request/account.dto';
import { ExpertPujaDto } from '@/internal/actors/expert/profile/dto/expert-puja.dto';

@Controller({ path: 'expert/account', version: '1' })
@UseGuards(ExpertJwtAuthGuard)
export class ExpertAccountController {
  private readonly logger = new Logger(ExpertAccountController.name);

  constructor(
    private readonly accountService: ExpertAccountService,
    private readonly imageUploadService: ImageUploadService,
    private readonly videoUploadService: VideoUploadService,
  ) {}

  @Get()
  getAccount(@CurrentExpert() expert: IExpert) {
    return this.accountService.getAccount(expert);
  }

  // this requires further attention
  // @Post()
  // createAccount(
  //   @CurrentExpert() expert: IExpert,
  //   @Body() dto: CreateExpertAccountDto,
  // ) {
  //   return this.accountService.createAccount(expert, dto);
  // }

  @Patch()
  updateAccount(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('personal-info')
  updatePersonalInfo(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('pricing')
  updatePricing(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('bank-details')
  updateBankDetails(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('portfolio')
  updatePortfolio(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('certificates')
  updateCertificates(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('documents')
  updateDocuments(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('experience')
  updateExperience(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountService.updateAccount(expert, dto);
  }

  @Patch('status')
  updateStatus(
    @CurrentExpert() expert: IExpert,
    @Body('is_available') isAvailable: boolean,
  ) {
    return this.accountService.updateStatus(expert, isAvailable);
  }

  @Patch('availability')
  updateAvailability(
    @CurrentExpert() expert: IExpert,
    @Body() dto: { mode: 'available' | 'unavailable' },
  ) {
    return this.accountService.updateStatus(expert, dto.mode === 'available');
  }

  @Post('puja')
  upsertPuja(
    @CurrentExpert() expert: IExpert,
    @Body() dto: ExpertPujaDto,
    @Query('id', new ParseIntPipe({ optional: true })) id?: number,
  ) {
    return this.accountService.upsertPuja(expert, dto, id);
  }

  @Delete('puja/:id')
  deletePuja(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.accountService.deletePuja(expert, id);
  }

  // @Get('pujas/all')
  // @Public()
  // listAllPujas() {
  //   return this.accountService.listAllPujas();
  // }

  // @Get('puja/info/:id')
  // @Public()
  // getPujaById(@Param('id', ParseIntPipe) id: number) {
  //   return this.accountService.getPujaById(id);
  // }

  @Patch(['avatar', 'picture'])
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async updateAvatar(
    @CurrentExpert() expert: IExpert,
    @UploadedFile() file: Express.Multer.File,
    @Body('public_id') public_id?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const allowed = /^image\/(jpeg|jpg|png|webp|avif)$/;
    if (!allowed.test(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }
    return this.accountService.updateAvatar(expert, file, public_id);
  }

  @Patch('intro-video')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async updateIntroVideo(
    @CurrentExpert() expert: IExpert,
    @UploadedFile() file: Express.Multer.File,
    @Body('public_id') public_id?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const allowed = /^video\/(mp4|webm|quicktime)$/;
    if (!allowed.test(file.mimetype)) {
      throw new BadRequestException(`Unsupported video type: ${file.mimetype}`);
    }
    return this.accountService.updateIntroVideo(expert, file, public_id);
  }

  /**
   * @deprecated Use `PATCH avatar` / `PATCH intro-video` instead.
   * Generic upload does not attach media to the expert account.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    this.logger.warn(
      'Deprecated POST expert/account/upload called; use PATCH avatar / intro-video',
    );
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

  /**
   * @deprecated Use `PATCH avatar` / `PATCH intro-video` instead.
   */
  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  uploadDocument(@UploadedFile() file: Express.Multer.File) {
    this.logger.warn(
      'Deprecated POST expert/account/upload-document called; use PATCH avatar / intro-video',
    );
    return this.uploadFile(file);
  }
}
