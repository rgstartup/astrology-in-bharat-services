import {
  Body,
  Controller,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExpertJwtAuthGuard } from '@/internal/actors/expert/auth/guards/auth.guard';
import { CurrentExpert } from '@/internal/actors/expert/auth/decorators/current-expert.decorator';
import type { IExpert } from '@/shared/types/access-token.payload';
import { ExpertChatService } from '../chat.service';
import { ExpertChatAttachmentResponseDto } from '../dto/chat-attachment-response.dto';

@Controller({
  path: 'expert/chat',
  version: '1',
})
@UseGuards(ExpertJwtAuthGuard)
export class ExpertChatController {
  constructor(private readonly expertChatService: ExpertChatService) {}

  @Post('attachments')
  @UseInterceptors(FileInterceptor('file'))
  async sendChatAttachment(
    @CurrentExpert() expert: IExpert,
    @Body('consultationId', ParseIntPipe) consultationId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('content') content?: string,
    @Body('idempotencyKey') idempotencyKey?: string,
  ): Promise<ExpertChatAttachmentResponseDto> {
    return this.expertChatService.sendAttachment(
      Number(expert.sub),
      consultationId,
      file,
      content,
      idempotencyKey,
    );
  }
}
