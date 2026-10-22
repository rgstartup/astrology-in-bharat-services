import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClientJwtAuthGuard } from "@/internal/actors/client/auth/guards/auth.guard";
import { CurrentClient } from "@/internal/actors/client/auth/decorators/current-client.decorator";
import { ClientChatService } from "../chat.service";
import { ClientConsultationService } from "../../consultation.service";
import { InitiateChatDto } from "../dto/initiate-chat.dto";
import { InitiateChatResponseDto } from "../dto/initiate-chat-response.dto";
import { ChatAttachmentResponseDto } from "../dto/chat-attachment-response.dto";
import { ChatHistoryResponseDto } from "../dto/chat-history-response.dto";

@Controller({
  path: "client/chat",
  version: "1",
})
@UseGuards(ClientJwtAuthGuard)
export class ClientChatController {
  constructor(
    private readonly clientChatService: ClientChatService,
    private readonly consultationService: ClientConsultationService,
  ) {}

  /**
   * @deprecated Use `POST /v1/client/consultations/initiate` with
   * `{ mode: 'chat' }` instead. Thin wrapper over the single service.
   */
  @Post("initiate")
  async initiateChat(
    @CurrentClient("id") clientId: number,
    @Body() dto: InitiateChatDto,
  ): Promise<InitiateChatResponseDto> {
    const session = await this.consultationService.initiateConsultation(
      clientId,
      dto.expert_id,
      'chat',
      dto?.consultation_id,
    );

    return session;
  }

  @Get("history/:consultationId")
  async getChatHistory(
    @CurrentClient("id") clientId: number,
    @Param("consultationId", ParseIntPipe) consultationId: number,
  ): Promise<ChatHistoryResponseDto> {
    return this.clientChatService.getChatHistory(clientId, consultationId);
  }

  @Post("attachments")
  @UseInterceptors(FileInterceptor("file"))
  async uploadChatAttachment(
    @CurrentClient("id") clientId: number,
    @Body("consultationId", ParseIntPipe) consultationId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("content") content?: string,
    @Body("idempotencyKey") idempotencyKey?: string,
  ): Promise<ChatAttachmentResponseDto> {
    return this.clientChatService.uploadAttachment(
      clientId,
      consultationId,
      file,
      content,
      idempotencyKey,
    );
  }
}
