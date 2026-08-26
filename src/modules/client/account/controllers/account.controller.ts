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
import { JwtAuthGuard } from '@/modules/client/auth/guards/auth.guard';
import { CurrentClient } from '@/common/decorators/current-client.decorator';
import { AccountFacade } from '../account.facade';
import {
  CreateClientAccountDto,
  UpdateClientAccountDto,
} from '../dto/account.dto';
import { SendPhoneOtpDto, VerifyPhoneOtpDto } from '../dto/phone-otp.dto';
import { ClientAccount } from '../entities/account.entity';

@Controller('client/account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountFacade: AccountFacade) { }

  @Get()
  async getAccount(@CurrentClient() client: ClientAccount) {
    return this.accountFacade.getAccount(client);
  }

  @Post()
  async createAccount(
    @CurrentClient() client: ClientAccount,
    @Body() dto: CreateClientAccountDto,
  ) {
    return this.accountFacade.createAccount(client.id, dto);
  }

  @Patch()
  async updateAccount(
    @CurrentClient() client: ClientAccount,
    @Body() dto: UpdateClientAccountDto,
  ) {
    return this.accountFacade.updateAccount(client, dto);
  }

  @Patch('picture')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async updateAccountPicture(
    @CurrentClient() client: ClientAccount,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.accountFacade.updateAccountPicture(client, file);
  }

  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async uploadDocument(
    @CurrentClient() client: ClientAccount,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.accountFacade.uploadDocument(client.id, file);
  }

  @Post('phone/send-otp')
  async sendPhoneOtp(
    @CurrentClient() client: ClientAccount,
    @Body() dto: SendPhoneOtpDto,
  ) {
    return this.accountFacade.sendPhoneOtp(client.id, dto);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(
    @CurrentClient() client: ClientAccount,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.accountFacade.verifyPhoneOtp(client.id, dto);
  }
}
