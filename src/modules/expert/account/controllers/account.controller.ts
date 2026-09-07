import {
  Body,
  BadRequestException,
  Controller,
  Delete,
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
import { CloudinaryService } from '@/external/cloudinary/cloudinary.service';
import { CurrentExpert } from '@/modules/expert/auth/decorators/current-expert.decorator';
import { IExpert } from '@/common/types/access-token.payload';
import { Public } from '@/common/decorators/public.decorator';
import { ExpertJwtAuthGuard } from '../../auth/guards/auth.guard';
import { ExpertAccountFacade } from '../account.facade';
import { UpdateExpertAccountDto } from '../dto/account.dto';
import { QueryExpertDto } from '../dto/query-expert.dto';
import { ExpertPujaDto } from '../../profile/api/dto/expert-puja.dto';

@Controller({ path: 'expert/account', version: '1' })
@UseGuards(ExpertJwtAuthGuard)
export class ExpertAccountController {
  constructor(
    private readonly accountFacade: ExpertAccountFacade,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  getAccount(@CurrentExpert() expert: IExpert) {
    return this.accountFacade.getAccount(expert);
  }

  // this requires further attention
  // @Post()
  // createAccount(
  //   @CurrentExpert() expert: IExpert,
  //   @Body() dto: CreateExpertAccountDto,
  // ) {
  //   return this.accountFacade.createAccount(expert, dto);
  // }

  @Patch()
  updateAccount(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('personal-info')
  updatePersonalInfo(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('pricing')
  updatePricing(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('bank-details')
  updateBankDetails(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('portfolio')
  updatePortfolio(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('certificates')
  updateCertificates(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('documents')
  updateDocuments(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('experience')
  updateExperience(
    @CurrentExpert() expert: IExpert,
    @Body() dto: UpdateExpertAccountDto,
  ) {
    return this.accountFacade.updateAccount(expert, dto);
  }

  @Patch('status')
  updateStatus(
    @CurrentExpert() expert: IExpert,
    @Body('is_available') isAvailable: boolean,
  ) {
    return this.accountFacade.updateStatus(expert, isAvailable);
  }

  @Get('list')
  @Public()
  listAccounts(@Query() query: QueryExpertDto) {
    return this.accountFacade.listAccounts(query);
  }

  @Get('top-rated')
  @Public()
  getTopRated(@Query('limit') limit = 3) {
    return this.accountFacade.getTopRated(Number(limit));
  }

  @Get(':id')
  @Public()
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountFacade.getById(id);
  }

  @Post('puja')
  upsertPuja(
    @CurrentExpert() expert: IExpert,
    @Body() dto: ExpertPujaDto,
    @Query('id') id?: string,
  ) {
    return this.accountFacade.upsertPuja(expert, dto, id);
  }

  @Delete('puja/:id')
  deletePuja(
    @CurrentExpert() expert: IExpert,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.accountFacade.deletePuja(expert, id);
  }

  @Get('pujas/all')
  @Public()
  listAllPujas() {
    return this.accountFacade.listAllPujas();
  }

  @Get('puja/info/:id')
  @Public()
  getPujaById(@Param('id', ParseUUIDPipe) id: string) {
    return this.accountFacade.getPujaById(id);
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
    const result = (await this.cloudinaryService.uploadImage(file)) as {
      secure_url: string;
    };
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
