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
import { ClientJwtAuthGuard } from '../../auth/guards/auth.guard';
import { CurrentClient } from '../../auth/decorators/current-client.decorator';
import { AccountService } from '../account.service';
import {
  CreateClientAccountDto,
  UpdateClientAccountDto,
} from '../dto/account.dto';
import { SendPhoneOtpDto, VerifyPhoneOtpDto } from '../dto/phone-otp.dto';
import { ClientAccount } from '../entities/account.entity';

@Controller('client/account')
@UseGuards(ClientJwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  getAccount(@CurrentClient() client: ClientAccount) {
    return client;
  }

  @Post()
  async createAccount(
    @CurrentClient() client: ClientAccount,
    @Body() dto: CreateClientAccountDto,
  ) {
    return this.accountService.createAccount(client.user.id, dto);
  }

  @Patch()
  async updateAccount(
    @CurrentClient() client: ClientAccount,
    @Body() dto: UpdateClientAccountDto,
  ) {
    return this.accountService.updateAccount(client, dto);
  }

  @Patch(['avatar', 'picture'])
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async updateAccountAvatar(
    @CurrentClient('id') clientId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.accountService.updateAccountPicture(clientId, file);
  }

  @Post('upload-document')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async uploadDocument(
    @CurrentClient() client: ClientAccount,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.accountService.uploadDocument(client.id, file);
  }

  @Post('phone/send-otp')
  async sendPhoneOtp(
    @CurrentClient() client: ClientAccount,
    @Body() dto: SendPhoneOtpDto,
  ) {
    return this.accountService.sendPhoneOtp(client.id, dto);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(
    @CurrentClient() client: ClientAccount,
    @Body() dto: VerifyPhoneOtpDto,
  ) {
    return this.accountService.verifyPhoneOtp(client.id, dto);
  }
}
