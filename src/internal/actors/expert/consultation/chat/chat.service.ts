import { Injectable } from '@nestjs/common';
import { SendChatAttachmentUseCase } from './use-cases/send-chat-attachment.usecase';
import { ExpertChatAttachmentResponseDto } from './dto/chat-attachment-response.dto';

@Injectable()
export class ExpertChatService {
  constructor(
    private readonly sendChatAttachmentUsecase: SendChatAttachmentUseCase,
  ) {}

  sendAttachment(
    expertId: number,
    consultationId: number,
    file: Express.Multer.File | undefined,
    content?: string,
    idempotencyKey?: string,
  ): Promise<ExpertChatAttachmentResponseDto> {
    return this.sendChatAttachmentUsecase.execute(
      expertId,
      consultationId,
      file,
      content,
      idempotencyKey,
    );
  }
}
